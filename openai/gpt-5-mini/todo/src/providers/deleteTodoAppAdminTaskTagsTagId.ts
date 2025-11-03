import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminTaskTagsTagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, tagId } = props;

  // Verify tag exists and is not already deleted
  const tag = await MyGlobal.prisma.todo_app_task_tags.findUnique({
    where: { id: tagId },
  });

  if (!tag || tag.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Check for any active task relations referencing this tag (task not deleted)
  const activeRelation =
    await MyGlobal.prisma.todo_app_task_tag_relations.findFirst({
      where: {
        todo_app_task_tag_id: tagId,
        task: { deleted_at: null },
      },
    });

  if (activeRelation) {
    const now = toISOStringSafe(new Date());
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        event_type: "delete_conflict",
        target_type: "task_tag",
        target_id: tagId,
        details: `Deletion blocked: active task relations exist for tag '${tag.name}'.`,
        created_at: now,
        updated_at: now,
      },
    });

    throw new HttpException("Conflict: tag in use", 409);
  }

  const now = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.todo_app_task_tags.update({
      where: { id: tagId },
      data: { deleted_at: now },
    });

    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        event_type: "delete",
        target_type: "task_tag",
        target_id: tagId,
        details: `Soft-deleted task tag '${tag.name}'.`,
        created_at: now,
        updated_at: now,
      },
    });

    return;
  } catch (error) {
    const nowErr = toISOStringSafe(new Date());
    try {
      await MyGlobal.prisma.todo_app_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_admin_id: admin.id,
          todo_app_admin_session_id: admin.session_id,
          event_type: "delete_error",
          target_type: "task_tag",
          target_id: tagId,
          details: `Delete failed: ${String(error)}`,
          created_at: nowErr,
          updated_at: nowErr,
        },
      });
    } catch (_) {
      // intentionally ignore audit write failures
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
