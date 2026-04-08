import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTimelogCollector {
  export async function collect(props: { body: IHrmPlatformTimelog.ICreate }) {
    const id: string = v4();
    return {
      id,
      start_datetime: new Date(props.body.start_datetime),
      end_datetime: new Date(props.body.end_datetime),
      duration_minutes: props.body.duration_minutes,
      description: props.body.description ?? null,
      billable: props.body.billable,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.body.employee_id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.hrm_platform_timelogsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformTimelogCollector {
//         export async function collect(props: {
//           body: IHrmPlatformTimelog.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       start_datetime: ...,
//       end_datetime: ...,
//       duration_minutes: ...,
//       description: ...,
//       billable: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       project: ...,
//       task: ...,
//       timesheetTimelogs: ...,
//           } satisfies Prisma.hrm_platform_timelogsCreateInput;
//         }
//       }
//--------------------------------------------------------------