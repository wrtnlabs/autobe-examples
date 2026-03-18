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
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status,
      priority: props.body.priority,
      estimated_hours: props.body.estimated_hours ?? null,
      due_date:
        props.body.due_date != null ? new Date(props.body.due_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: {
        connect: {
          id: props.project.id,
        },
      },
      assignee:
        props.body.hrm_time_tracking_employee_id != null
          ? {
              connect: {
                id: props.body.hrm_time_tracking_employee_id,
              },
            }
          : undefined,
      parent:
        props.body.parent_id != null
          ? {
              connect: {
                id: props.body.parent_id,
              },
            }
          : undefined,
    } satisfies Prisma.hrm_time_tracking_tasksCreateInput;
  }
}
