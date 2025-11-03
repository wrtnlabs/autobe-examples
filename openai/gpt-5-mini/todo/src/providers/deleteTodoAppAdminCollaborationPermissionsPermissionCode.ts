import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminCollaborationPermissionsPermissionCode(props: {
  admin: AdminPayload;
  permissionCode: string;
}): Promise<void> {
  const { admin, permissionCode } = props;

  // Retrieve permission by its unique code
  const permission =
    await MyGlobal.prisma.todo_app_collaboration_permissions.findUnique({
      where: { code: permissionCode },
    });

  if (!permission) {
    throw new HttpException(
      "Not Found: collaboration permission not found",
      404,
    );
  }

  // Prepare ISO timestamp once and reuse in audit record
  const now = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.todo_app_collaboration_permissions.delete({
        where: { code: permissionCode },
      }),

      MyGlobal.prisma.todo_app_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_admin_id: admin.id,
          todo_app_admin_session_id: admin.session_id,
          event_type: "delete_permission",
          target_type: "permission",
          target_id: permission.id,
          details: `Deleted collaboration permission with code=${permissionCode}`,
          created_at: now,
          updated_at: now,
        },
      }),
    ]);

    return;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Foreign key constraint prevents deletion
      if (error.code === "P2003") {
        throw new HttpException(
          "Conflict: Permission is referenced and cannot be deleted",
          409,
        );
      }
      // Record not found during delete (race)
      if (error.code === "P2025") {
        throw new HttpException(
          "Not Found: collaboration permission not found",
          404,
        );
      }
    }

    // Unexpected error
    throw new HttpException("Internal Server Error", 500);
  }
}
