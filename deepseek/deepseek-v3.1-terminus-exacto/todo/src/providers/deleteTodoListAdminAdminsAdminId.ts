import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Only allow privileged admins (e.g., superadmin role)
  const requestingAdmin = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.admin.id, deleted_at: null },
    select: { role: true, locked: true, id: true },
  });
  if (!requestingAdmin || requestingAdmin.locked) {
    throw new HttpException(
      "Forbidden: Your admin account is not active.",
      403,
    );
  }
  // Only designated role(s) are allowed (e.g., superadmin)
  if (requestingAdmin.role !== "superadmin") {
    throw new HttpException(
      "Forbidden: Insufficient admin privileges to hard delete admins.",
      403,
    );
  }
  // Block self-deletion
  if (props.admin.id === props.adminId) {
    throw new HttpException(
      "Forbidden: Admins cannot erase their own account in this session.",
      403,
    );
  }
  // 2. Find the target admin to delete
  const target = await MyGlobal.prisma.todo_list_admins.findUnique({
    where: { id: props.adminId },
    select: { id: true, email: true, deleted_at: true },
  });
  // 3. If not found or already deleted, throw 404
  if (!target || target.deleted_at !== null) {
    throw new HttpException("Admin not found or already deleted.", 404);
  }
  // 4. Hard erase
  await MyGlobal.prisma.todo_list_admins.delete({
    where: { id: props.adminId },
  });

  // 5. Write audit log (append only, required by requirements)
  await MyGlobal.prisma.todo_list_audit_logs.create({
    data: {
      id: v4(),
      actor_admin_id: props.admin.id,
      actor_admin_session_id: props.admin.session_id,
      event_action: "admin_account_hard_delete",
      event_status: "success",
      event_context: JSON.stringify({
        erased_admin_id: props.adminId,
        erased_admin_email: target.email,
      }),
      created_at: toISOStringSafe(new Date()),
      // nullable fields for user (irrelevant here)
      actor_user_id: null,
      actor_user_session_id: null,
      affected_todo_id: null,
      ip_address: null,
      user_agent: null,
    },
  });
  return;
}
