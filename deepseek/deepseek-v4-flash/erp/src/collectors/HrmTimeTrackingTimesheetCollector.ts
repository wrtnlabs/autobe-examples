import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimesheetCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimesheet.ICreate;
    hrmTimeTrackingEmployees: IEntity;
    hrmTimeTrackingMemberSessions: IEntity;
  }) {
    const id: string = v4();
    const weekStartDate: Date = new Date(props.body.week_start_date);
    return {
      id,
      week_start_date: weekStartDate,
      week_end_date: new Date(
        weekStartDate.getTime() + 6 * 24 * 60 * 60 * 1000,
      ),
      status: "draft",
      total_hours: 0,
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmTimeTrackingEmployees.id } },
      reviewer: undefined,
      timelogs: undefined,
    } satisfies Prisma.hrm_time_tracking_timesheetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingTimesheetCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingTimesheet.ICreate;
//           hrmTimeTrackingEmployees: IEntity; // from authorized actor
// hrmTimeTrackingMemberSessions: IEntity; // from authorized session
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
//       timelogs: ...,
//           } satisfies Prisma.hrm_time_tracking_timesheetsCreateInput;
//         }
//       }
//--------------------------------------------------------------