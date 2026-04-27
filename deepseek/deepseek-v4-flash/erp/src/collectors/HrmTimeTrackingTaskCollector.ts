import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackingTaskCollector {
  export async function collect(props: {
    body: IHrmTimeTrackingTask.ICreate;
    hrmTimeTrackingProjects: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      status: "open",
      priority: props.body.priority ?? "medium",
      estimated_hours: props.body.estimated_hours ?? null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: {
        connect: { id: props.hrmTimeTrackingProjects.id },
      },
      assignedEmployee: props.body.employee_id
        ? { connect: { id: props.body.employee_id } }
        : undefined,
      parentTask: props.body.parent_task_id
        ? { connect: { id: props.body.parent_task_id } }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_tasksCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmTimeTrackingTaskCollector {
//         export async function collect(props: {
//           body: IHrmTimeTrackingTask.ICreate;
//           hrmTimeTrackingProjects: IEntity; // from path parameter projectId
//           
//           
//         }) {
//           return {
//       id: ...,
//       title: ...,
//       description: ...,
//       status: ...,
//       priority: ...,
//       estimated_hours: ...,
//       due_date: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       project: ...,
//       assignedEmployee: ...,
//       parentTask: ...,
//       subtasks: ...,
//       taskHistories: ...,
//       timelogs: ...,
//       timers: ...,
//           } satisfies Prisma.hrm_time_tracking_tasksCreateInput;
//         }
//       }
//--------------------------------------------------------------