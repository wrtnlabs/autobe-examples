import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTimelogCollector {
  export async function collect(props: {
    body: IHrmPlatformTimelog.ICreate;
    hrmPlatformEmployees: IEntity;
  }): Promise<Prisma.hrm_platform_timelogsCreateInput> {
    return {
      id: v4(),
      date: new Date(props.body.date),
      duration_minutes: props.body.durationMinutes,
      work_description: props.body.workDescription ?? null,
      billable: props.body.billable ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: {
        connect: { id: props.hrmPlatformEmployees.id },
      },
      project: {
        connect: { id: props.body.projectId },
      },
      task: props.body.taskId
        ? { connect: { id: props.body.taskId } }
        : undefined,
      timesheet: undefined,
    } satisfies Prisma.hrm_platform_timelogsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformTimelogCollector {
//         export async function collect(props: {
//           body: IHrmPlatformTimelog.ICreate;
//           hrmPlatformEmployees: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       date: ...,
//       duration_minutes: ...,
//       work_description: ...,
//       billable: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       project: ...,
//       task: ...,
//       timesheet: ...,
//           } satisfies Prisma.hrm_platform_timelogsCreateInput;
//         }
//       }
//--------------------------------------------------------------