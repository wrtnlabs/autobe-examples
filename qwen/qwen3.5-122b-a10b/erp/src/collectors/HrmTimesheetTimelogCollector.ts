import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimesheetTimelogCollector {
  export async function collect(props: {
    body: IHrmTimesheetTimelog.ICreate;
    hrmOrganizations: IEntity;
    hrmMembers: IEntity;
  }) {
    const id: string = v4();
    const weekStartDate = new Date(props.body.week_start_date);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    return {
      id,
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
      employee: { connect: { id: props.body.hrm_employee_id } },
      reviewer: undefined,
    } satisfies Prisma.hrm_timesheetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimesheetTimelogCollector {
//         export async function collect(props: {
//           body: IHrmTimesheetTimelog.ICreate;
//           hrmOrganizations: IEntity; // from path parameter organizationId
// hrmMembers: IEntity; // from authorized actor
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
//       reviewer: ...,
//       timesheetTimelogs: ...,
//           } satisfies Prisma.hrm_timesheetsCreateInput;
//         }
//       }
//--------------------------------------------------------------