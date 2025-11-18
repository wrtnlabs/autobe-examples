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
  // Confirm session exists and is linked to the correct admin
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_list_admin_id: props.adminId,
    },
  });
  if (!session) {
    throw new HttpException("Session not found or already deleted", 404);
  }

  // Perform hard deletion
  await MyGlobal.prisma.todo_list_admin_sessions.delete({
    where: { id: props.sessionId },
  });
}
