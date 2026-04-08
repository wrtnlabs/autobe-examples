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
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      status: "open",
      priority: "medium",
      estimated_hours: props.body.estimatedHours ?? null,
      due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
      created_at: new Date(),
      updated_at: new Date(),
      project: { connect: { id: props.erpHrmProjects.id } },
      assignee: props.body.erpHrmEmployeeId
        ? { connect: { id: props.body.erpHrmEmployeeId } }
        : undefined,
      parent: props.body.parentId
        ? { connect: { id: props.body.parentId } }
        : undefined,
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
//       project: ...,
//       assignee: ...,
//       parent: ...,
//       subtasks: ...,
//       taskHistories: ...,
//       timelogs: ...,
//       timers: ...,
//           } satisfies Prisma.erp_hrm_tasksCreateInput;
//         }
//       }
//--------------------------------------------------------------