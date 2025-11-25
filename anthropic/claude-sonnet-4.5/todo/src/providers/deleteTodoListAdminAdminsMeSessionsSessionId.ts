import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findUnique({
    where: { id: props.sessionId },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.todo_list_admin_id !== props.admin.id) {
    throw new HttpException(
      "Forbidden: Cannot revoke another admin's session",
      403,
    );
  }

  await MyGlobal.prisma.todo_list_admin_sessions.update({
    where: { id: props.sessionId },
    data: {
      expired_at: toISOStringSafe(new Date()),
    },
  });
}
