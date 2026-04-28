import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTaskCollector {
  export async function collect(props: {
    body: IHrmPlatformTask.ICreate;
    hrmPlatformProjects: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status ?? "open",
      priority: props.body.priority ?? "medium",
      estimated_hours: props.body.estimated_hours,
      due_at: props.body.due_at ? new Date(props.body.due_at) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      project: { connect: { id: props.hrmPlatformProjects.id } },
      assignedEmployee: props.body.assigned_employee_id
        ? { connect: { id: props.body.assigned_employee_id } }
        : undefined,
      parentTask: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
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
//           hrmPlatformProjects: IEntity; // from path parameter projectId
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
//       due_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       project: ...,
//       assignedEmployee: ...,
//       parentTask: ...,
//       subtasks: ...,
//       timelogs: ...,
//       hrmPlatformTimers: ...,
//       histories: ...,
//           } satisfies Prisma.hrm_platform_tasksCreateInput;
//         }
//       }
//--------------------------------------------------------------