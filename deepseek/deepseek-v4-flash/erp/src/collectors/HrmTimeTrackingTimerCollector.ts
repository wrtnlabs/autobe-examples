import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimerCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimer.ICreate;
    hrmTimeTrackingEmployees: IEntity;
    hrmTimeTrackingMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      description: props.body.description ?? null,
      started_at: new Date(),
      stopped_at: null,
      status: "running",
      created_at: new Date(),
      updated_at: new Date(),
      employee: { connect: { id: props.hrmTimeTrackingEmployees.id } },
      project: { connect: { id: props.body.projectId } },
      task: props.body.taskId
        ? { connect: { id: props.body.taskId } }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_timersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingTimerCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingTimer.ICreate;
//           hrmTimeTrackingEmployees: IEntity; // from authorized actor
// hrmTimeTrackingMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       description: ...,
//       started_at: ...,
//       stopped_at: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       employee: ...,
//       project: ...,
//       task: ...,
//           } satisfies Prisma.hrm_time_tracking_timersCreateInput;
//         }
//       }
//--------------------------------------------------------------