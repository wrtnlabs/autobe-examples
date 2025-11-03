import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  const { admin, adminId, sessionId } = props;

  // Authorization: ensure the authenticated admin matches the target adminId
  if (admin.id !== adminId) {
    throw new HttpException(
      "Forbidden: you may only manage your own sessions",
      403,
    );
  }

  // Ensure session exists and belongs to the admin
  const session = await MyGlobal.prisma.todo_app_admin_sessions.findFirst({
    where: {
      id: sessionId,
      todo_app_admin_id: adminId,
    },
  });

  if (!session) {
    throw new HttpException("Not Found", 404);
  }

  const now = toISOStringSafe(new Date());

  try {
    await MyGlobal.prisma.$transaction([
      // Hard-delete the session because todo_app_admin_sessions doesn't have deleted_at
      MyGlobal.prisma.todo_app_admin_sessions.delete({
        where: { id: sessionId },
      }),

      // Record admin action for forensic trail
      MyGlobal.prisma.todo_app_admin_actions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_admin_id: admin.id,
          todo_app_admin_session_id: sessionId,
          action: "revoke_session",
          reason: null,
          target_type: "admin_session",
          target_id: sessionId,
          details: `Admin ${admin.id} revoked admin session ${sessionId}`,
          audit_case_id: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      }),

      // Append audit log entry
      MyGlobal.prisma.todo_app_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_admin_id: admin.id,
          todo_app_admin_session_id: sessionId,
          event_type: "admin.session.revoked",
          target_type: "admin_session",
          target_id: sessionId,
          details: `Deleted admin session ${sessionId} by admin ${admin.id}`,
          ip: null,
          href: null,
          user_agent: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      }),
    ]);

    return;
  } catch (err) {
    // Attempt to record failure in audit logs (best-effort)
    try {
      await MyGlobal.prisma.todo_app_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          todo_app_admin_id: admin.id,
          todo_app_admin_session_id: sessionId,
          event_type: "admin.session.revoke_failed",
          details: `Failed to revoke session ${sessionId}: ${String(err)}`,
          ip: null,
          href: null,
          user_agent: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    } catch (_) {
      // swallow secondary audit failures
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
