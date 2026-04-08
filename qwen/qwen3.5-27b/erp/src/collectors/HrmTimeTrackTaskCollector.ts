import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmTimeTrackTaskCollector {
  export async function collect(props: { body: IHrmTimeTrackTask.ICreate }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      priority: props.body.priority ?? "medium",
      status: props.body.status ?? "pending",
      effort_estimate: props.body.effort_estimate ?? null,
      effort_actual: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.body.hrm_time_track_project_id } },
      employee: props.body.hrm_time_track_employee_id
        ? { connect: { id: props.body.hrm_time_track_employee_id } }
        : undefined,
      parentTask: props.body.parent_task_id
        ? { connect: { id: props.body.parent_task_id } }
        : undefined,
    } satisfies Prisma.hrm_time_track_tasksCreateInput;
  }
}
