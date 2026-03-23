import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace HrmPlatformTaskSnapshotCollector {
  export async function collect(props: {
    body: IHrmPlatformTaskSnapshot.ICreate;
  }) {
    // Query source task to extract all denormalized fields
    const task = await MyGlobal.prisma.hrm_platform_tasks.findFirstOrThrow({
      where: { id: props.body.hrm_platform_task_id },
    });
    return {
      id: v4(),
      title: task.title,
      description: task.description ?? null,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date ?? null,
      estimated_hours: task.estimated_hours ?? null,
      task_created_at: task.created_at,
      updated_at: task.updated_at,
      deleted_at: task.deleted_at ?? null,
      snapshot_created_at: new Date(),
      task: { connect: { id: props.body.hrm_platform_task_id } },
      project: { connect: { id: task.hrm_platform_project_id } },
      employee: task.assigned_employee_id
        ? { connect: { id: task.assigned_employee_id } }
        : undefined,
      parentTask: task.parent_task_id
        ? { connect: { id: task.parent_task_id } }
        : undefined,
      creatorSession: task.created_by_member_id
        ? { connect: { id: task.created_by_member_id } }
        : undefined,
    } satisfies Prisma.hrm_platform_task_snapshotsCreateInput;
  }
}
