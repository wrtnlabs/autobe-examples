import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify administrative privilege boundary: Only the correct admin can do this
  if (props.admin.id !== props.adminId) {
    throw new HttpException("Forbidden: Admin scope mismatch", 403);
  }

  // Check if admin exists and has not been deleted (deleted_at is null)
  const admin = await MyGlobal.prisma.todo_app_admins.findFirst({
    where: { id: props.adminId, deleted_at: null },
  });
  if (!admin) {
    throw new HttpException("Admin not found", 404);
  }

  // Find session for this admin
  const session = await MyGlobal.prisma.todo_app_admin_sessions.findFirst({
    where: { id: props.sessionId, admin_id: props.adminId },
  });
  if (!session) {
    throw new HttpException("Session not found or not owned by admin", 404);
  }

  // Proceed to delete (permanent)
  await MyGlobal.prisma.todo_app_admin_sessions.delete({
    where: { id: props.sessionId },
  });
}
