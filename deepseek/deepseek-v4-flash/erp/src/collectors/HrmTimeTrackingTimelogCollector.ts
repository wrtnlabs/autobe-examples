import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTimelogCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTimelog.ICreate;
    hrmTimeTrackingEmployees: IEntity;
    hrmTimeTrackingMemberSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      date: new Date(props.body.date),
      duration_minutes: props.body.duration_minutes,
      description: props.body.description ?? null,
      billable: props.body.billable ?? true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      employee: { connect: { id: props.hrmTimeTrackingEmployees.id } },
      project: { connect: { id: props.body.project_id } },
      task: props.body.task_id
        ? { connect: { id: props.body.task_id } }
        : undefined,
      timesheet: undefined,
    } satisfies Prisma.hrm_time_tracking_timelogsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingTimelogCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingTimelog.ICreate;
//           hrmTimeTrackingEmployees: IEntity; // from authorized actor
// hrmTimeTrackingMemberSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       date: ...,
//       duration_minutes: ...,
//       description: ...,
//       billable: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       employee: ...,
//       project: ...,
//       task: ...,
//       timesheet: ...,
//           } satisfies Prisma.hrm_time_tracking_timelogsCreateInput;
//         }
//       }
//--------------------------------------------------------------