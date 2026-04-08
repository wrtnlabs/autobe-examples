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
  }) {
    const id: string = v4();
    return {
      id,
      start_date: new Date(props.body.start_date),
      end_date: new Date(props.body.end_date),
      status: "pending",
      submitted_at: null,
      approved_at: null,
      rejected_at: null,
      cancelled_at: null,
      notes: props.body.notes ?? null,
      total_hours: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: {
        connect: { id: props.body.hrm_platform_employee_id },
      },
    } satisfies Prisma.hrm_platform_timesheetsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformTimesheetCollector {
//         export async function collect(props: {
//           body: IHrmPlatformTimesheet.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       start_date: ...,
//       end_date: ...,
//       status: ...,
//       submitted_at: ...,
//       approved_at: ...,
//       rejected_at: ...,
//       cancelled_at: ...,
//       notes: ...,
//       total_hours: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       timelogs: ...,
//       actions: ...,
//           } satisfies Prisma.hrm_platform_timesheetsCreateInput;
//         }
//       }
//--------------------------------------------------------------