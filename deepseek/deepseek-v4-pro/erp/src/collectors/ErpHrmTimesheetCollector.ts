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
    erpHrmEmployees: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    const weekStartDate = new Date(props.body.week_start_date);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    return {
      id: v4(),
      week_start_date: weekStartDate,
      week_end_date: weekEndDate,
      status: "draft",
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.erpHrmEmployees.id } },
      reviewedByUser: undefined,
    } satisfies Prisma.erp_hrm_timesheetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmTimesheetCollector {
//         export async function collect(props: {
//           body: IErpHrmTimesheet.ICreate;
//           erpHrmEmployees: IEntity; // from authorized actor
// erpHrmMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       week_start_date: ...,
//       week_end_date: ...,
//       status: ...,
//       submitted_at: ...,
//       reviewed_at: ...,
//       rejection_reason: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       reviewedByUser: ...,
//       timelogs: ...,
//           } satisfies Prisma.erp_hrm_timesheetsCreateInput;
//         }
//       }
//--------------------------------------------------------------