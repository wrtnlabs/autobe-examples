import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminAdminsMeSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, sessionId } = props;

  // Fetch the session to verify it exists and belongs to this admin
  const session =
    await MyGlobal.prisma.todo_list_admin_sessions.findUniqueOrThrow({
      where: { id: sessionId },
      select: {
        id: true,
        todo_list_admin_id: true,
        expired_at: true,
      },
    });

  // Authorization: Verify session belongs to the authenticated admin
  if (session.todo_list_admin_id !== admin.id) {
    throw new HttpException(
      "Unauthorized: You can only terminate your own sessions",
      403,
    );
  }

  // Check if session is already expired
  if (session.expired_at !== null) {
    throw new HttpException("Session is already terminated", 400);
  }

  // Soft delete by setting expired_at to current timestamp
  await MyGlobal.prisma.todo_list_admin_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: toISOStringSafe(new Date()),
    },
  });
}
