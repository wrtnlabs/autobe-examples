import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteTodoAppAdminUserMemberUsersMemberUserIdSessionsSessionId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { adminUser, memberUserId, sessionId } = props;

  // Basic safety check: ensure payload represents an admin actor.
  if (adminUser.type !== "admin") {
    throw new HttpException(
      "Forbidden: only admin users may delete member sessions",
      403,
    );
  }

  // Ensure the target member user exists and is not logically deleted.
  const memberUser = await MyGlobal.prisma.todo_app_memberusers.findFirst({
    where: {
      id: memberUserId,
      deleted_at: null,
    },
  });

  if (memberUser === null) {
    throw new HttpException("Target member user not found", 404);
  }

  // Ensure the session exists and is associated with the given member user.
  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.findFirst({
    where: {
      id: sessionId,
      todo_app_memberuser_id: memberUserId,
    },
  });

  if (session === null) {
    throw new HttpException(
      "Session not found for the specified member user",
      404,
    );
  }

  // Hard delete of the session row.
  await MyGlobal.prisma.todo_app_memberuser_sessions.delete({
    where: {
      id: sessionId,
    },
  });
}
