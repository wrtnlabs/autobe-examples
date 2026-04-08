import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmActiveTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActiveTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmActiveTimerCollector {
  export async function collect(props: {
    body: IHrmActiveTimer.ICreate;
    employee: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      description: props.body.description ?? null,
      start_timestamp: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      employee: { connect: { id: props.employee.id } },
      project: { connect: { id: props.body.projectId } },
      task: props.body.taskId
        ? { connect: { id: props.body.taskId } }
        : undefined,
    } satisfies Prisma.hrm_active_timersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmActiveTimerCollector {
//         export async function collect(props: {
//           body: IHrmActiveTimer.ICreate;
//           hrmEmployees: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       description: ...,
//       start_timestamp: ...,
//       created_at: ...,
//       updated_at: ...,
//       employee: ...,
//       project: ...,
//       task: ...,
//           } satisfies Prisma.hrm_active_timersCreateInput;
//         }
//       }
//--------------------------------------------------------------