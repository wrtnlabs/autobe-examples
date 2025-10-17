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

  // Confirm caller exists and is authorized
  const caller = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
  });
  if (!caller) {
    throw new HttpException("Unauthorized: caller not found", 401);
  }
  if (!caller.is_super) {
    throw new HttpException("Forbidden: super-admin required", 403);
  }

  // Disallow self-deletion to prevent accidental lockout
  if (admin.id === adminId) {
    throw new HttpException("Conflict: self-deletion is forbidden", 409);
  }

  // Verify target exists
  const target = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: adminId },
  });
  if (!target) {
    throw new HttpException("Not Found", 404);
  }

  // If target is a super-admin, ensure at least one other super-admin remains
  if (target.is_super) {
    const otherSuperCount = await MyGlobal.prisma.todo_app_admin.count({
      where: { is_super: true, id: { not: adminId } },
    });
    if (otherSuperCount === 0) {
      throw new HttpException(
        "Conflict: cannot delete the last remaining super-admin",
        409,
      );
    }
  }

  // Timestamp for audit record
  const created_at = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.$transaction([
      // Create an append-only audit record documenting the erase action
      MyGlobal.prisma.todo_app_audit_records.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          admin_id: admin.id,
          user_id: null,
          actor_role: "admin",
          action_type: "erase_admin",
          target_resource: "admin",
          target_id: adminId,
          reason: null,
          created_at,
        },
      }),

      // Hard-delete the admin record (no soft-delete field exists)
      MyGlobal.prisma.todo_app_admin.delete({ where: { id: adminId } }),
    ]);
  } catch (error) {
    // For security, avoid leaking internal DB errors. Return generic 500.
    throw new HttpException("Internal Server Error", 500);
  }
}
