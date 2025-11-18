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
  // Attempt to delete the session only if it exists and is associated with the admin
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findUnique({
    where: {
      id: props.sessionId,
      todo_list_admin_id: props.adminId,
    },
  });

  if (!session) {
    throw new HttpException(
      "Admin session not found for given adminId/sessionId",
      404,
    );
  }

  await MyGlobal.prisma.todo_list_admin_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
}
