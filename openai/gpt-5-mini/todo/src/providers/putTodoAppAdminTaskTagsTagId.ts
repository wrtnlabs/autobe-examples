import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTaskTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTaskTag";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoAppAdminTaskTagsTagId(props: {
  admin: AdminPayload;
  tagId: string & tags.Format<"uuid">;
  body: ITodoAppTaskTag.IUpdate;
}): Promise<ITodoAppTaskTag> {
  const { admin, tagId, body } = props;

  // Authorization: ensure admin account is active and not soft-deleted
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
    select: { id: true, is_active: true, deleted_at: true },
  });

  if (
    !adminRecord ||
    adminRecord.deleted_at !== null ||
    adminRecord.is_active !== true
  ) {
    throw new HttpException(
      "Unauthorized: admin account inactive or not found",
      403,
    );
  }

  // Ensure target tag exists and is not soft-deleted
  const tag = await MyGlobal.prisma.todo_app_task_tags.findUnique({
    where: { id: tagId },
  });
  if (!tag || tag.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // If name provided, ensure uniqueness among active tags (exclude current)
  if (body.name !== undefined) {
    const existing = await MyGlobal.prisma.todo_app_task_tags.findFirst({
      where: {
        name: body.name,
        deleted_at: null,
        NOT: { id: tagId },
      },
    });

    if (existing) {
      throw new HttpException("Conflict: tag name already exists", 409);
    }
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.todo_app_task_tags.update({
    where: { id: tagId },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
