import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTimerCollector {
  export async function collect(props: {
    body: IHrmPlatformTimer.ICreate;
    hrmPlatformMembers: IEntity;
    hrmPlatformEmployees: IEntity;
  }) {
    return {
      id: v4(),
      description: props.body.description ?? null,
      billable: props.body.billable ?? true,
      started_at: new Date(),
      stopped_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      member: { connect: { id: props.hrmPlatformMembers.id } },
      employee: { connect: { id: props.hrmPlatformEmployees.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
    } satisfies Prisma.hrm_platform_timersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformTimerCollector {
//         export async function collect(props: {
//           body: IHrmPlatformTimer.ICreate;
//           hrmPlatformMembers: IEntity; // from authorized actor
// hrmPlatformEmployees: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       description: ...,
//       billable: ...,
//       started_at: ...,
//       stopped_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       member: ...,
//       employee: ...,
//       project: ...,
//       task: ...,
//           } satisfies Prisma.hrm_platform_timersCreateInput;
//         }
//       }
//--------------------------------------------------------------