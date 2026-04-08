import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTaskCollector {
  export async function collect(props: { body: IHrmPlatformTask.ICreate }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: "TODO",
      priority: props.body.priority ?? "MEDIUM",
      estimated_hours: props.body.estimated_hours ?? null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.body.project_id } },
      parentTask: props.body.parent_task_id
        ? { connect: { id: props.body.parent_task_id } }
        : undefined,
      assignedEmployee: props.body.assigned_employee_id
        ? { connect: { id: props.body.assigned_employee_id } }
        : undefined,
    } satisfies Prisma.hrm_platform_tasksCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace HrmPlatformTaskCollector {
//         export async function collect(props: {
//           body: IHrmPlatformTask.ICreate;
//           
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
//       parentTask: ...,
//       assignedEmployee: ...,
//       childrenTasks: ...,
//       histories: ...,
//       timers: ...,
//       timelogs: ...,
//           } satisfies Prisma.hrm_platform_tasksCreateInput;
//         }
//       }
//--------------------------------------------------------------