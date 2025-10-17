import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putAuthAdminPasswordChange(props: {
  admin: AdminPayload;
  body: ITodoAppAdmin.IChangePassword;
}): Promise<ITodoAppAdmin.IMessage> {
  const { admin, body } = props;
  const { currentPassword, newPassword } = body;

  // Ensure admin exists
  let dbAdmin;
  try {
    dbAdmin = await MyGlobal.prisma.todo_app_admin.findUniqueOrThrow({
      where: { id: admin.id },
    });
  } catch (_err) {
    throw new HttpException("Unauthorized: admin not found", 403);
  }

  // Verify current password
  const storedHash = dbAdmin.password_hash ?? "";
  const verified = await PasswordUtil.verify(currentPassword, storedHash);
  if (!verified) throw new HttpException("Invalid current password", 400);

  // Hash new password
  const newHash = await PasswordUtil.hash(newPassword);

  // Timestamp for DB writes and audit
  const now: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  ) as string & tags.Format<"date-time">;

  // Update admin record (schema does not have `updated_at`)
  try {
    await MyGlobal.prisma.todo_app_admin.update({
      where: { id: admin.id },
      data: {
        password_hash: newHash,
        last_active_at: now,
      },
    });
  } catch (_err) {
    throw new HttpException("Internal Server Error", 500);
  }

  // Record audit event
  try {
    await MyGlobal.prisma.todo_app_audit_records.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: admin.id,
        user_id: null,
        actor_role: "admin",
        action_type: "change_password",
        target_resource: "admin",
        target_id: admin.id,
        reason: null,
        created_at: now,
      },
    });
  } catch (_err) {
    // Audit failure should not silently succeed; surface as server error
    throw new HttpException("Internal Server Error", 500);
  }

  return { message: "Password changed successfully" };
}
