import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoAppAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the target session by userId and sessionId
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      user_id: props.userId,
    },
  });

  // Step 2: If not found, throw 404
  if (!session) {
    throw new HttpException("Session not found for given user", 404);
  }

  // Step 3: If already expired, succeed silently (idempotent delete)
  if (session.expired_at !== null) {
    return;
  }

  // Step 4: Mark session as expired now
  await MyGlobal.prisma.todo_app_user_sessions.update({
    where: { id: props.sessionId },
    data: { expired_at: toISOStringSafe(new Date()) },
  });

  // Step 5: (Optional/Audit) TODO: Add audit log entry here using admin info
}
