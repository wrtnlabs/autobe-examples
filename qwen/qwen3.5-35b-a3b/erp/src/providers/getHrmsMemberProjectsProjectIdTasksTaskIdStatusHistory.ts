import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTaskStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTaskStatusHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberProjectsProjectIdTasksTaskIdStatusHistory(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmsTaskStatusHistory[]> {
  // Verify task exists and belongs to the specified project
  await MyGlobal.prisma.hrms_tasks.findFirstOrThrow({
    where: {
      id: props.taskId,
      hrms_project_id: props.projectId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Query status history ordered by most recent first, excluding soft-deleted records
  const statusHistories =
    await MyGlobal.prisma.hrms_task_status_histories.findMany({
      where: {
        hrms_task_id: props.taskId,
        deleted_at: null,
      },
      select: {
        id: true,
        old_status: true,
        new_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            display_name: true,
            avatar_uri: true,
          },
        },
        task: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
  // Transform each record using the transformer
  return await ArrayUtil.asyncMap(statusHistories, async (record) => ({
    id: record.id as string & tags.Format<"uuid">,
    old_status: record.old_status,
    new_status: record.new_status,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: toISOStringSafe(record.deleted_at ?? new Date()),
    performed_by: {
      id: record.member.id as string & tags.Format<"uuid">,
      display_name: record.member.display_name,
      avatar_uri: record.member.avatar_uri ?? null,
    },
    task: {
      id: record.task.id as string & tags.Format<"uuid">,
    },
  }));
}
