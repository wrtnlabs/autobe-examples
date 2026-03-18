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
    erpHrmMembers: IEntity;
    erpHrmMemberSessions: IEntity;
  }) {
    return {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status ?? "open",
      priority: props.body.priority ?? "medium",
      estimated_hours: props.body.estimated_hours ?? null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      project: { connect: { id: props.erpHrmProjects.id } },
      assignee: props.body.assignee_id
        ? { connect: { id: props.body.assignee_id } }
        : undefined,
      parent: props.body.parent_id
        ? { connect: { id: props.body.parent_id } }
        : undefined,
    } satisfies Prisma.erp_hrm_tasksCreateInput;
  }
}
