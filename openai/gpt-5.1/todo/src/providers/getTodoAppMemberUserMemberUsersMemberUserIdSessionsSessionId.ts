import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuserSession";
import { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function getTodoAppMemberUserMemberUsersMemberUserIdSessionsSessionId(props: {
  memberUser: MemberuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppMemberuserSession> {
  // Authorize: member users may only inspect their own sessions
  if (props.memberUser.id !== props.memberUserId) {
    throw new HttpException("Forbidden", 403);
  }

  const session = await MyGlobal.prisma.todo_app_memberuser_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_app_memberuser_id: props.memberUserId,
    },
    include: {
      memberUser: true,
    },
  });

  if (session === null) {
    throw new HttpException("Session not found", 404);
  }

  const owner = session.memberUser;

  const memberUserSummary: ITodoAppMemberuser.ISummary = {
    id: owner.id,
    email: owner.email,
    display_name: owner.display_name,
    status: owner.status,
    last_login_at:
      owner.last_login_at === null
        ? null
        : toISOStringSafe(owner.last_login_at),
  };

  return {
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
    memberUser: memberUserSummary,
  };
}
