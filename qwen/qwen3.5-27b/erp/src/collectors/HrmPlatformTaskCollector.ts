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
    hrmPlatformMembers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status ?? "pending",
      priority: props.body.priority ?? "normal",
      due_date: props.body.due_date ?? null,
      estimated_hours: props.body.estimated_hours ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.hrmPlatformProjects.id } },
      assignedEmployee: props.body.assigned_employee_id
        ? { connect: { id: props.body.assigned_employee_id } }
        : undefined,
      parentTask: props.body.parent_task_id
        ? { connect: { id: props.body.parent_task_id } }
        : undefined,
      createdByMember: { connect: { id: props.hrmPlatformMembers.id } },
      subtasks: undefined,
      taskHistories: undefined,
      snapshots: undefined,
      subtaskSnapshots: undefined,
      timers: undefined,
      timelogs: undefined,
    } satisfies Prisma.hrm_platform_tasksCreateInput;
  }
}
