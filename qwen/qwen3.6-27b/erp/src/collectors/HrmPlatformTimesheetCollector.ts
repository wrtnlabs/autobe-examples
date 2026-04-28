import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTimesheetCollector {
  export async function collect(props: {
    body: IHrmPlatformTimesheet.ICreate;
    hrmPlatformEmployees: IEntity;
  }) {
    const id: string = v4();
    const startDate = new Date(props.body.week_start_date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    return {
      id,
      week_start_date: startDate,
      week_end_date: endDate,
      status: "draft",
      total_hours: 0,
      submitted_at: null,
      reviewed_at: null,
      rejection_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmPlatformEmployees.id } },
      reviewer: undefined,
      timelogs: undefined,
    } satisfies Prisma.hrm_platform_timesheetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformTimesheetCollector {
//         export async function collect(props: {
//           body: IHrmPlatformTimesheet.ICreate;
//           hrmPlatformEmployees: IEntity; // from authorized actor
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
//           } satisfies Prisma.hrm_platform_timesheetsCreateInput;
//         }
//       }
//--------------------------------------------------------------