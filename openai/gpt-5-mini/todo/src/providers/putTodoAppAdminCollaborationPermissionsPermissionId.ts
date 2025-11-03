import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppCollaborationPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppCollaborationPermission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoAppAdminCollaborationPermissionsPermissionId(props: {
  admin: AdminPayload;
  permissionId: string & tags.Format<"uuid">;
  body: ITodoAppCollaborationPermission.IUpdate;
}): Promise<ITodoAppCollaborationPermission> {
  const { admin, permissionId, body } = props;

  // Authorization: ensure admin is active and not soft-deleted
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findFirst({
    where: { id: admin.id, deleted_at: null, is_active: true },
  });
  if (!adminRecord) {
    throw new HttpException("Unauthorized", 403);
  }

  // Load existing permission
  const existing =
    await MyGlobal.prisma.todo_app_collaboration_permissions.findUnique({
      where: { id: permissionId },
    });
  if (!existing) {
    throw new HttpException("Not Found", 404);
  }

  // Uniqueness check for code
  if (body.code !== undefined) {
    const conflict =
      await MyGlobal.prisma.todo_app_collaboration_permissions.findFirst({
        where: {
          code: body.code,
          NOT: { id: permissionId },
        },
      });
    if (conflict) {
      throw new HttpException("Conflict: permission code already exists", 409);
    }
  }

  // Prepare timestamp once
  const now = toISOStringSafe(new Date());

  // Update - inline data object
  const updated =
    await MyGlobal.prisma.todo_app_collaboration_permissions.update({
      where: { id: permissionId },
      data: {
        ...(body.code !== undefined && { code: body.code }),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.isGrantable !== undefined && {
          is_grantable: body.isGrantable,
        }),
        updated_at: now,
      },
    });

  // Audit the admin action (best-effort - do not block the response if audit fails)
  try {
    await MyGlobal.prisma.todo_app_admin_actions.create({
      data: {
        id: v4(),
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        todo_app_todouser_id: null,
        action: "update_collaboration_permission",
        reason: null,
        target_type: "collaboration_permission",
        target_id: permissionId,
        details: JSON.stringify({
          before: {
            code: existing.code,
            description: existing.description,
            isGrantable: existing.is_grantable,
          },
          after: {
            code: updated.code,
            description: updated.description,
            isGrantable: updated.is_grantable,
          },
        }),
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (_err) {
    // Swallow audit errors to avoid failing primary operation
  }

  return {
    id: updated.id,
    code: updated.code,
    description: updated.description === null ? null : updated.description,
    isGrantable: updated.is_grantable,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
  };
}
