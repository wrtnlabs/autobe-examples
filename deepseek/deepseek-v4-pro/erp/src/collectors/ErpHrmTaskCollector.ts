import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTaskCollector {
  export async function collect(props: {
    body: IErpHrmTask.ICreate;
    erpHrmProjects: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status ?? "open",
      priority: props.body.priority ?? "medium",
      estimated_hours: props.body.estimated_hours ?? null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.erpHrmProjects.id } },
      assignedEmployee: props.body.assigned_employee_id
        ? { connect: { id: props.body.assigned_employee_id } }
        : undefined,
      parentTask: props.body.parent_task_id
        ? { connect: { id: props.body.parent_task_id } }
        : undefined,
      childTasks: undefined,
      statusHistories: undefined,
      timelogs: undefined,
      timers: undefined,
    } satisfies Prisma.erp_hrm_tasksCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ErpHrmTaskCollector {
//         export async function collect(props: {
//           body: IErpHrmTask.ICreate;
//           erpHrmProjects: IEntity; // from path parameter projectId
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
//       childTasks: ...,
//       statusHistories: ...,
//       timelogs: ...,
//       timers: ...,
//           } satisfies Prisma.erp_hrm_tasksCreateInput;
//         }
//       }
//--------------------------------------------------------------