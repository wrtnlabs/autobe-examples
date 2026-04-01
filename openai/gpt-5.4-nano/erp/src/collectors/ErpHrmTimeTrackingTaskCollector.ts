import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTrackingTaskCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingTask.ICreate;
    project: IEntity;
  }) {
    const id = v4();
    const due_date: Date | null =
      props.body.due_date === undefined || props.body.due_date === null
        ? null
        : new Date(props.body.due_date);
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status,
      priority: props.body.priority,
      estimated_hours: props.body.estimated_hours ?? null,
      due_date,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.project.id } },
      parentTask: props.body.parent_task_id
        ? { connect: { id: props.body.parent_task_id } }
        : undefined,
      assignedEmployee: props.body.assigned_employee_id
        ? { connect: { id: props.body.assigned_employee_id } }
        : undefined,
      childTasks: undefined,
      timelogs: undefined,
      timerSessions: undefined,
      reportOutputs: undefined,
    } satisfies Prisma.erp_hrm_time_tracking_tasksCreateInput;
  }
}
