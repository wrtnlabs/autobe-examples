import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminAdminsAdminIdSessionsSessionId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findUnique({
    where: { id: props.sessionId },
  });
  if (!session) {
    throw new HttpException("Admin session not found.", 404);
  }
  if (session.admin_id !== props.adminId) {
    throw new HttpException("Session does not belong to provided admin.", 403);
  }
  await MyGlobal.prisma.todo_list_admin_sessions.delete({
    where: { id: props.sessionId },
  });
  await MyGlobal.prisma.todo_list_audit_logs.create({
    data: {
      id: v4(),
      actor_admin_id: props.admin.id,
      created_at: toISOStringSafe(new Date()),
      event_action: "delete_admin_session",
      event_status: "success",
    },
  });
}
