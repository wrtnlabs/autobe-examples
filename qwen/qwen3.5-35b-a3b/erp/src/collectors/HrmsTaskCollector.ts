import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmsTaskCollector {
  export async function collect(props: {
    body: IHrmsTask.ICreate;
    hrmsProjects: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status ?? "open",
      priority: props.body.priority ?? "medium",
      estimated_hours: props.body.estimated_hours ?? null,
      due_date: props.body.due_date ?? null,
      billable: props.body.billable ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.hrmsProjects.id } },
      assignedEmployee: props.body.hrms_employee_id
        ? { connect: { id: props.body.hrms_employee_id } }
        : undefined,
      parentTask: props.body.hrms_task_id
        ? { connect: { id: props.body.hrms_task_id } }
        : undefined,
    } satisfies Prisma.hrms_tasksCreateInput;
  }
}
