import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimesheetCollector {
  export async function collect(props: {
    body: IErpHrmTimesheet.ICreate;
    employee: IEntity;
  }) {
    const weekStartDate = new Date(props.body.weekStartDate);
    const weekEndDate = new Date(
      weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000,
    );
    return {
      id: v4(),
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      status: "draft",
      total_hours: 0,
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.employee.id } },
    } satisfies Prisma.erp_hrm_timesheetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmTimesheetCollector {
//         export async function collect(props: {
//           body: IErpHrmTimesheet.ICreate;
//           erpHrmMembers: IEntity; // from authorized actor
// erpHrmEmployees: IEntity; // from authorized actor
// erpHrmOrganizations: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       week_start_date: ...,
//       week_end_date: ...,
//       status: ...,
//       total_hours: ...,
//       submitted_at: ...,
//       reviewed_at: ...,
//       rejection_reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       reviewerEmployee: ...,
//       timesheetTimelogs: ...,
//           } satisfies Prisma.erp_hrm_timesheetsCreateInput;
//         }
//       }
//--------------------------------------------------------------