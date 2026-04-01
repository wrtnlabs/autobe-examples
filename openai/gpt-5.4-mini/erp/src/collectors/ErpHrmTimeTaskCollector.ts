import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ErpHrmTimeTaskCollector {
  export async function collect(props: {
    body: IErpHrmTimeTask.ICreate;
    erpHrmTimeProjects: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: "pending",
      priority: props.body.priority ?? "normal",
      estimated_hours: props.body.estimatedHours ?? null,
      due_date: props.body.dueDate ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      project: {
        connect: { id: props.erpHrmTimeProjects.id },
      },
      employee: props.body.employeeId
        ? { connect: { id: props.body.employeeId } }
        : undefined,
      parentTask: props.body.parentTaskId
        ? { connect: { id: props.body.parentTaskId } }
        : undefined,
    } satisfies Prisma.erp_hrm_time_tasksCreateInput;
  }
}
