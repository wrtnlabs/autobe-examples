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
    hrmPlatformEmployees: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      status: "started",
      last_tick_at: new Date(),
      duration_seconds: 0,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmPlatformEmployees.id } },
      project: props.body.hrm_platform_project_id
        ? { connect: { id: props.body.hrm_platform_project_id } }
        : undefined,
      task: props.body.hrm_platform_task_id
        ? { connect: { id: props.body.hrm_platform_task_id } }
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
//           hrmPlatformEmployees: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       status: ...,
//       last_tick_at: ...,
//       duration_seconds: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       project: ...,
//       task: ...,
//           } satisfies Prisma.hrm_platform_timersCreateInput;
//         }
//       }
//--------------------------------------------------------------