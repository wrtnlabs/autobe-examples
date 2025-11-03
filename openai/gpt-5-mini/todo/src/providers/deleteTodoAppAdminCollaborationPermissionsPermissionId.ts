import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminCollaborationPermissionsPermissionId(props: {
  admin: AdminPayload;
  permissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, permissionId } = props;

  try {
    // Verify the permission exists
    const permission =
      await MyGlobal.prisma.todo_app_collaboration_permissions.findUnique({
        where: { id: permissionId },
      });

    if (!permission) {
      throw new HttpException("Not Found", 404);
    }

    // Timestamp for audit
    const now = toISOStringSafe(new Date());

    // Schema does not have a 'deleted_at' field; perform hard delete
    await MyGlobal.prisma.todo_app_collaboration_permissions.delete({
      where: { id: permissionId },
    });

    // Record audit of the deletion action
    await MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4(),
        todo_app_admin_id: admin.id,
        todo_app_admin_session_id: admin.session_id,
        event_type: "delete_permission",
        target_type: "permission",
        target_id: permissionId,
        details: null,
        created_at: now,
        updated_at: now,
      },
    });

    return;
  } catch (err) {
    if (err instanceof HttpException) throw err;

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      throw new HttpException("Conflict", 409);
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
