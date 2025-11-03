import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, adminId } = props;

  // Verify caller exists and is active
  const caller = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
  });

  if (!caller) throw new HttpException("Unauthorized: admin not found", 403);
  if (caller.deleted_at !== null || caller.is_active !== true)
    throw new HttpException("Unauthorized: inactive admin", 403);

  // Authorization: require superadmin role
  if (caller.role !== "superadmin")
    throw new HttpException("Forbidden: insufficient privileges", 403);

  // Load target admin
  const target = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: adminId },
  });

  if (!target) throw new HttpException("Not Found", 404);
  if (target.deleted_at !== null) throw new HttpException("Gone", 410);
  if (target.id === caller.id)
    throw new HttpException(
      "Forbidden: cannot delete your own admin account",
      403,
    );

  // Prepare timestamp once and reuse
  const now = toISOStringSafe(new Date());

  // Atomic operations: revoke sessions, soft-delete admin, record admin action and audit log
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_app_admin_sessions.updateMany({
      where: {
        todo_app_admin_id: adminId,
        expired_at: null,
      },
      data: { expired_at: now },
    }),

    MyGlobal.prisma.todo_app_admin.update({
      where: { id: adminId },
      data: {
        deleted_at: now,
        is_active: false,
        updated_at: now,
      },
    }),

    MyGlobal.prisma.todo_app_admin_actions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: caller.id,
        todo_app_admin_session_id: admin.session_id,
        action: "soft_delete",
        target_type: "admin",
        target_id: adminId,
        details: `Admin ${caller.id} performed soft delete on admin ${adminId}`,
        created_at: now,
        updated_at: now,
      },
    }),

    MyGlobal.prisma.todo_app_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        todo_app_admin_id: caller.id,
        todo_app_admin_session_id: admin.session_id,
        event_type: "delete",
        target_type: "admin",
        target_id: adminId,
        details: `Admin ${caller.id} soft-deleted admin ${adminId}`,
        created_at: now,
        updated_at: now,
      },
    }),
  ]);

  return;
}
