import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserSession";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getTodoAppAdminUserMemberUsersMemberUserIdSessionsSessionId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberUserSession> {
  // This provider is restricted to administrative users. The `adminUser`
  // payload has already been validated and authorized by the decorator
  // pipeline, so no additional role checks are required here.

  // Look up the session ensuring it belongs to the specified member user.
  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_app_memberuser_id: props.memberUserId,
    },
    include: {
      memberUser: true,
    },
  });

  // If either the session does not exist or does not belong to the given
  // member user, return 404 without leaking cross-user information.
  if (session === null) {
    throw new HttpException(
      "Session not found for the specified member user",
      404,
    );
  }

  const memberUser = session.memberUser;

  // Defensive check: the relation must exist according to the schema, but we
  // still guard against unexpected nulls to avoid runtime errors.
  if (!memberUser) {
    throw new HttpException("Member user not found for the given session", 404);
  }

  // Map member user entity into ITodoAppMemberUser.ISummary.
  const memberUserSummary: ITodoAppMemberUser.ISummary = {
    id: memberUser.id,
    email: memberUser.email,
    display_name:
      memberUser.display_name === null ? null : memberUser.display_name,
    status: memberUser.status,
    created_at: toISOStringSafe(memberUser.created_at),
  };

  // Map the session entity into ITodoAppMemberUserSession DTO.
  const result: ITodoAppMemberUserSession = {
    id: session.id,
    memberUser: memberUserSummary,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };

  return result;
}
