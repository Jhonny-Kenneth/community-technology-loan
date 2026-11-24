import pg, { type Pool, type PoolClient } from "pg";
import bcrypt from "bcryptjs";
import type {
  CenterQuery, CreateCenter, CreateDevice, CreateLoan, CreateMaintenance,
  Device, DeviceQuery, InventoryRepository, Loan, LoanQuery, LoanReason,
  MaintenanceQuery, MaintenanceRecord, OutreachCenter, Page, UpdateCenter,
  UpdateDevice, UpdateLoan, UpdateMaintenance
} from "./types.js";
import { RepositoryConflict, RepositoryNotFound } from "./types.js";

const { Pool: PgPool } = pg;

export class PostgresInventoryRepository implements InventoryRepository {
  readonly pool: Pool;

  constructor(connectionString: string) {
    this.pool = new PgPool({ connectionString, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false });
  }

  async health(): Promise<void> { await this.pool.query("SELECT 1"); }

  async authenticate(tenantId: string, email: string, password: string): Promise<{ userId: number; tenantId: string; name: string; email: string; role: "ADMIN" | "STAFF" } | undefined> {
    const r = await this.pool.query("SELECT user_id,tenant_id,name,email,password_hash,role,failed_attempts,locked_until,is_active,approval_status FROM app.users WHERE tenant_id=$1 AND lower(email)=lower($2)", [tenantId, email]);
    const user = r.rows[0];
    if (!user || !user.is_active || user.approval_status !== "APPROVED" || (user.locked_until && new Date(user.locked_until) > new Date())) return undefined;
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = Number(user.failed_attempts ?? 0) + 1;
      await this.pool.query("UPDATE app.users SET failed_attempts=$3, locked_until=$4 WHERE tenant_id=$1 AND user_id=$2", [tenantId, user.user_id, attempts, attempts >= 3 ? new Date(Date.now() + 15 * 60 * 1000) : null]);
      return undefined;
    }
    await this.pool.query("UPDATE app.users SET failed_attempts=0,locked_until=NULL WHERE tenant_id=$1 AND user_id=$2", [tenantId, user.user_id]);
    return { userId: user.user_id, tenantId: user.tenant_id, name: user.name, email: user.email, role: user.role };
  }

  private page<T>(items: T[], cursor: number | undefined, limit: number, id: keyof T): Page<T> {
    const nextCursor = items.length === limit ? Number(items.at(-1)?.[id]) : undefined;
    return { items: items.slice(0, limit), nextCursor };
  }

  private filters(values: unknown[], clauses: string[]) { return { values, sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "" }; }

  async listDevices(t: string, q: DeviceQuery) {
    const values: unknown[] = [t]; const clauses: string[] = [];
    const add = (sql: string, value: unknown) => { clauses.push(sql.replace("?", `$${values.length + 1}`)); values.push(value); };
    if (q.deviceType) add("device_type = ?", q.deviceType);
    if (q.status) add("status = ?", q.status);
    if (q.centerId) add("center_id = ?", q.centerId);
    if (q.assetTag) add("asset_tag = ?", q.assetTag);
    if (q.serialNumber) add("serial_number = ?", q.serialNumber);
    if (q.search) { const i = values.length + 1; values.push(`%${q.search}%`); clauses.push(`(asset_tag ILIKE $${i} OR serial_number ILIKE $${i} OR manufacturer ILIKE $${i} OR model ILIKE $${i})`); }
    if (q.manufacturer) { const i = values.length + 1; values.push(`%${q.manufacturer}%`); clauses.push(`manufacturer ILIKE $${i}`); }
    if (q.model) { const i = values.length + 1; values.push(`%${q.model}%`); clauses.push(`model ILIKE $${i}`); }
    if (q.cursor) { const i = values.length + 1; values.push(q.cursor); clauses.push(`device_id > $${i}`); }
    const limitIndex = values.length + 1; values.push(q.limit);
    const r = await this.pool.query(`SELECT device_id,asset_tag,serial_number,device_type,manufacturer,model,status,center_id,purchase_date,purchase_cost,depreciation_rate FROM app.devices WHERE tenant_id=$1${clauses.length ? ` AND ${clauses.join(" AND ")}` : ""} ORDER BY device_id LIMIT $${limitIndex}`, values);
    const items = r.rows.map(this.device); return this.page(items, q.cursor, q.limit, "deviceId");
  }
  async getDevice(t: string, id: number) { const r = await this.pool.query("SELECT * FROM app.devices WHERE tenant_id=$1 AND device_id=$2", [t,id]); return r.rows[0] ? this.device(r.rows[0]) : undefined; }
  async createDevice(t: string, d: CreateDevice) {
    try { const r = await this.pool.query(`INSERT INTO app.devices(tenant_id,asset_tag,serial_number,device_type,manufacturer,model,status,center_id,purchase_date,purchase_cost,depreciation_rate) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [t,d.assetTag,d.serialNumber,d.deviceType,d.manufacturer,d.model,d.status,d.centerId,d.purchaseDate??null,d.purchaseCost??0,d.depreciationRate??null]); return this.device(r.rows[0]); }
    catch (e) { throw this.mapError(e, "Center not found or asset/serial number already exists"); }
  }
  async updateDevice(t: string, id: number, p: UpdateDevice) { const keys = Object.entries(p).filter(([,v]) => v !== undefined); if (!keys.length) return this.getDevice(t,id); const fields = keys.map(([k],i)=>`${this.column(k)}=$${i+3}`).join(","); const r=await this.pool.query(`UPDATE app.devices SET ${fields} WHERE tenant_id=$1 AND device_id=$2 RETURNING *`, [t,id,...keys.map(([,v])=>v)]); return r.rows[0]?this.device(r.rows[0]):undefined; }

  async listCenters(t:string,q:CenterQuery){const values:[unknown,string][]=[[t,"tenant_id=$1"]]; let i=1; const clauses:string[]=[]; if(q.isActive!==undefined){i++;values.push([q.isActive,`is_active=$${i}`]);clauses.push(`is_active=$${i}`);} if(q.search){i++;values.push([`%${q.search}%`,`(center_name ILIKE $${i} OR address ILIKE $${i} OR phone ILIKE $${i})`]);clauses.push(`(center_name ILIKE $${i} OR address ILIKE $${i} OR phone ILIKE $${i})`);} if(q.cursor){i++;values.push([q.cursor,`center_id>$${i}`]);clauses.push(`center_id>$${i}`);} i++;values.push([q.limit,`LIMIT $${i}`]);const sql=`SELECT * FROM app.outreach_centers WHERE tenant_id=$1${clauses.length?` AND ${clauses.join(" AND ")}`:""} ORDER BY center_id ${values.at(-1)?.[1]}`;const r=await this.pool.query(sql,values.map(v=>v[0]).slice(0,-1));return this.page(r.rows.map(this.center),q.cursor,q.limit,"centerId");}
  async getCenter(t:string,id:number){const r=await this.pool.query("SELECT * FROM app.outreach_centers WHERE tenant_id=$1 AND center_id=$2",[t,id]);return r.rows[0]?this.center(r.rows[0]):undefined;} 
  async createCenter(t:string,c:CreateCenter){const r=await this.pool.query("INSERT INTO app.outreach_centers(tenant_id,center_name,address,phone,is_active) VALUES($1,$2,$3,$4,$5) RETURNING *",[t,c.centerName,c.address,c.phone,c.isActive]);return this.center(r.rows[0]);}
  async updateCenter(t:string,id:number,p:UpdateCenter){const keys=Object.entries(p).filter(([,v])=>v!==undefined);if(!keys.length)return this.getCenter(t,id);const fields=keys.map(([k],i)=>`${this.column(k)}=$${i+3}`).join(",");const r=await this.pool.query(`UPDATE app.outreach_centers SET ${fields} WHERE tenant_id=$1 AND center_id=$2 RETURNING *`,[t,id,...keys.map(([,v])=>v)]);return r.rows[0]?this.center(r.rows[0]):undefined;}

  async listLoans(t:string,q:LoanQuery){const values:unknown[]=[t];const clauses:string[]=[];const add=(col:string,val:unknown)=>{values.push(val);clauses.push(`${col}=$${values.length}`)};if(q.loanStatus)add("loan_status",q.loanStatus);if(q.centerId)add("center_id",q.centerId);if(q.deviceId)add("device_id",q.deviceId);if(q.participantCode)add("participant_code",q.participantCode);if(q.reasonId)add("reason_id",q.reasonId);if(q.cursor){values.push(q.cursor);clauses.push(`loan_id>$${values.length}`)}const lim=values.length+1;values.push(q.limit);const r=await this.pool.query(`SELECT * FROM app.loans WHERE tenant_id=$1${clauses.length?` AND ${clauses.join(" AND ")}`:""} ORDER BY loan_id LIMIT $${lim}`,values);return this.page(r.rows.map(this.loan),q.cursor,q.limit,"loanId");}
  async getLoan(t:string,id:number){const r=await this.pool.query("SELECT * FROM app.loans WHERE tenant_id=$1 AND loan_id=$2",[t,id]);return r.rows[0]?this.loan(r.rows[0]):undefined;}
  async createLoan(t:string,l:CreateLoan){const client=await this.pool.connect();try{await client.query("BEGIN");const d=await client.query("SELECT status FROM app.devices WHERE tenant_id=$1 AND device_id=$2 FOR UPDATE",[t,l.deviceId]);if(!d.rows[0])throw new RepositoryNotFound("Device not found");if(d.rows[0].status!=="AVAILABLE")throw new RepositoryConflict("Device is not available");await client.query("SELECT 1 FROM app.outreach_centers WHERE tenant_id=$1 AND center_id=$2",[t,l.centerId]);await client.query("SELECT 1 FROM app.loan_reasons WHERE tenant_id=$1 AND reason_id=$2",[t,l.reasonId]);const r=await client.query("INSERT INTO app.loans(tenant_id,device_id,center_id,reason_id,participant_code,checkout_date,due_date,loan_status) VALUES($1,$2,$3,$4,$5,$6,$7,'ACTIVE') RETURNING *",[t,l.deviceId,l.centerId,l.reasonId,l.participantCode,l.checkoutDate,l.dueDate]);await client.query("UPDATE app.devices SET status='CHECKED_OUT' WHERE tenant_id=$1 AND device_id=$2",[t,l.deviceId]);await client.query("COMMIT");return this.loan(r.rows[0]);}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}}
  async updateLoan(t:string,id:number,p:UpdateLoan){const keys=Object.entries(p).filter(([,v])=>v!==undefined);if(!keys.length)return this.getLoan(t,id);const fields=keys.map(([k],i)=>`${this.column(k)}=$${i+3}`).join(",");const r=await this.pool.query(`UPDATE app.loans SET ${fields} WHERE tenant_id=$1 AND loan_id=$2 AND loan_status!='RETURNED' RETURNING *`,[t,id,...keys.map(([,v])=>v)]);return r.rows[0]?this.loan(r.rows[0]):undefined;}
  async returnLoan(t:string,id:number,date:string){const client=await this.pool.connect();try{await client.query("BEGIN");const r=await client.query("SELECT * FROM app.loans WHERE tenant_id=$1 AND loan_id=$2 FOR UPDATE",[t,id]);if(!r.rows[0]){await client.query("ROLLBACK");return;}if(r.rows[0].loan_status==="RETURNED")throw new RepositoryConflict("Loan has already been returned");await client.query("UPDATE app.loans SET return_date=$3,loan_status='RETURNED' WHERE tenant_id=$1 AND loan_id=$2 RETURNING *",[t,id,date]);await client.query("UPDATE app.devices SET status='AVAILABLE' WHERE tenant_id=$1 AND device_id=$2",[t,r.rows[0].device_id]);await client.query("COMMIT");const out=await this.pool.query("SELECT * FROM app.loans WHERE tenant_id=$1 AND loan_id=$2",[t,id]);return this.loan(out.rows[0]);}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}}

  async listLoanReasons(t:string){const r=await this.pool.query("SELECT * FROM app.loan_reasons WHERE tenant_id=$1 ORDER BY reason_id",[t]);return r.rows.map(this.reason);} async getLoanReason(t:string,id:number){const r=await this.pool.query("SELECT * FROM app.loan_reasons WHERE tenant_id=$1 AND reason_id=$2",[t,id]);return r.rows[0]?this.reason(r.rows[0]):undefined;}async createLoanReason(t:string,name:string){try{const r=await this.pool.query("INSERT INTO app.loan_reasons(tenant_id,reason_name) VALUES($1,$2) RETURNING *",[t,name]);return this.reason(r.rows[0]);}catch(e){throw this.mapError(e,"Loan reason already exists");}}async updateLoanReason(t:string,id:number,name:string){try{const r=await this.pool.query("UPDATE app.loan_reasons SET reason_name=$3 WHERE tenant_id=$1 AND reason_id=$2 RETURNING *",[t,id,name]);return r.rows[0]?this.reason(r.rows[0]):undefined;}catch(e){throw this.mapError(e,"Loan reason already exists");}}

  async listMaintenance(t:string,q:MaintenanceQuery){const values:unknown[]=[t];const clauses:string[]=[];if(q.deviceId){values.push(q.deviceId);clauses.push(`device_id=$${values.length}`)}if(q.maintenanceStatus){values.push(q.maintenanceStatus);clauses.push(`maintenance_status=$${values.length}`)}if(q.cursor){values.push(q.cursor);clauses.push(`maintenance_id>$${values.length}`)}const lim=values.length+1;values.push(q.limit);const r=await this.pool.query(`SELECT * FROM app.maintenance_records WHERE tenant_id=$1${clauses.length?` AND ${clauses.join(" AND ")}`:""} ORDER BY maintenance_id LIMIT $${lim}`,values);return this.page(r.rows.map(this.maintenance),q.cursor,q.limit,"maintenanceId");}
  async getMaintenance(t:string,id:number){const r=await this.pool.query("SELECT * FROM app.maintenance_records WHERE tenant_id=$1 AND maintenance_id=$2",[t,id]);return r.rows[0]?this.maintenance(r.rows[0]):undefined;}async createMaintenance(t:string,m:CreateMaintenance){const client=await this.pool.connect();try{await client.query("BEGIN");const d=await client.query("SELECT status FROM app.devices WHERE tenant_id=$1 AND device_id=$2 FOR UPDATE",[t,m.deviceId]);if(!d.rows[0])throw new RepositoryNotFound("Device not found");if(d.rows[0].status!=="AVAILABLE")throw new RepositoryConflict("Device is not available for maintenance");const r=await client.query("INSERT INTO app.maintenance_records(tenant_id,device_id,issue_description,service_date,maintenance_status) VALUES($1,$2,$3,$4,'OPEN') RETURNING *",[t,m.deviceId,m.issueDescription,m.serviceDate]);await client.query("UPDATE app.devices SET status='MAINTENANCE' WHERE tenant_id=$1 AND device_id=$2",[t,m.deviceId]);await client.query("COMMIT");return this.maintenance(r.rows[0]);}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}}async updateMaintenance(t:string,id:number,p:UpdateMaintenance){const keys=Object.entries(p).filter(([,v])=>v!==undefined);if(!keys.length)return this.getMaintenance(t,id);const fields=keys.map(([k],i)=>`${this.column(k)}=$${i+3}`).join(",");const r=await this.pool.query(`UPDATE app.maintenance_records SET ${fields} WHERE tenant_id=$1 AND maintenance_id=$2 AND maintenance_status!='RESOLVED' RETURNING *`,[t,id,...keys.map(([,v])=>v)]);return r.rows[0]?this.maintenance(r.rows[0]):undefined;}async resolveMaintenance(t:string,id:number,date:string){const client=await this.pool.connect();try{await client.query("BEGIN");const r=await client.query("SELECT * FROM app.maintenance_records WHERE tenant_id=$1 AND maintenance_id=$2 FOR UPDATE",[t,id]);if(!r.rows[0]){await client.query("ROLLBACK");return;}if(r.rows[0].maintenance_status==="RESOLVED")throw new RepositoryConflict("Maintenance is already resolved");await client.query("UPDATE app.maintenance_records SET resolved_date=$3,maintenance_status='RESOLVED' WHERE tenant_id=$1 AND maintenance_id=$2",[t,id,date]);await client.query("UPDATE app.devices SET status='AVAILABLE' WHERE tenant_id=$1 AND device_id=$2",[t,r.rows[0].device_id]);await client.query("COMMIT");const out=await this.pool.query("SELECT * FROM app.maintenance_records WHERE tenant_id=$1 AND maintenance_id=$2",[t,id]);return this.maintenance(out.rows[0]);}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}}

  private mapError(e: unknown, fallback:string){const code=(e as {code?:string}).code;if(code==="23505")return new RepositoryConflict(fallback);if(code==="23503")return new RepositoryNotFound(fallback);return e instanceof Error?e:new RepositoryConflict(fallback);}
  private column=(k:string)=>({assetTag:"asset_tag",serialNumber:"serial_number",deviceType:"device_type",centerId:"center_id",centerName:"center_name",isActive:"is_active",reasonId:"reason_id",dueDate:"due_date",issueDescription:"issue_description",maintenanceStatus:"maintenance_status",purchaseDate:"purchase_date",purchaseCost:"purchase_cost",depreciationRate:"depreciation_rate"}[k]??k);
  private device=(r:any):Device=>({deviceId:r.device_id,assetTag:r.asset_tag,serialNumber:r.serial_number,deviceType:r.device_type,manufacturer:r.manufacturer,model:r.model,status:r.status,centerId:r.center_id,purchaseDate:r.purchase_date?.toISOString().slice(0,10)??null,purchaseCost:Number(r.purchase_cost??0),depreciationRate:r.depreciation_rate===null||r.depreciation_rate===undefined?null:Number(r.depreciation_rate)});
  private center=(r:any):OutreachCenter=>({centerId:r.center_id,centerName:r.center_name,address:r.address,phone:r.phone,isActive:r.is_active,createdAt:r.created_at.toISOString()});
  private loan=(r:any):Loan=>({loanId:r.loan_id,deviceId:r.device_id,centerId:r.center_id,reasonId:r.reason_id,participantCode:r.participant_code,checkoutDate:r.checkout_date.toISOString(),dueDate:r.due_date.toISOString(),returnDate:r.return_date?.toISOString()??null,loanStatus:r.loan_status});
  private reason=(r:any):LoanReason=>({reasonId:r.reason_id,reasonName:r.reason_name});
  private maintenance=(r:any):MaintenanceRecord=>({maintenanceId:r.maintenance_id,deviceId:r.device_id,issueDescription:r.issue_description,serviceDate:r.service_date.toISOString().slice(0,10),resolvedDate:r.resolved_date?.toISOString().slice(0,10)??null,maintenanceStatus:r.maintenance_status});
}
