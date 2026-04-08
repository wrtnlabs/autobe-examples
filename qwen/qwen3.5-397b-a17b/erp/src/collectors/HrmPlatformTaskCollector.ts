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
    const id: string = v4();
    return {
      // Scalar fields
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status ?? "open",
      priority: props.body.priority,
      estimated_hours: props.body.estimated_hours ?? null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      project: { connect: { id: props.hrmPlatformProjects.id } },
      assignedEmployee: props.body.assigned_employee_id
        ? { connect: { id: props.body.assigned_employee_id } }
        : undefined,
      parentTask: props.body.parent_task_id
        ? { connect: { id: props.body.parent_task_id } }
        : undefined,
      // HasMany relations (reverse relations, cannot create)
      subtasks: undefined,
      histories: undefined,
      timelogs: undefined,
      timers: undefined,
    } satisfies Prisma.hrm_platform_tasksCreateInput;
  }
}
