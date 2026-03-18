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
    project: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status ?? "open",
      priority: props.body.priority,
      estimated_hours: props.body.estimatedHours ?? null,
      due_date: props.body.dueDate ? new Date(props.body.dueDate) : null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      project: { connect: { id: props.project.id } },
      assignee: props.body.assignedEmployeeId
        ? { connect: { id: props.body.assignedEmployeeId } }
        : undefined,
      parent: props.body.parentTaskId
        ? { connect: { id: props.body.parentTaskId } }
        : undefined,
    } satisfies Prisma.hrm_time_tracking_tasksCreateInput;
  }
}
