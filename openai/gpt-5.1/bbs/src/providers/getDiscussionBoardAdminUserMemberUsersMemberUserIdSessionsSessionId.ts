import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuserSession";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserMemberUsersMemberUserIdSessionsSessionId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberuserSession> {
  const session =
    await MyGlobal.prisma.discussion_board_memberuser_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_memberuser_id: props.memberUserId,
      },
    });

  if (session === null) {
    throw new HttpException("Member user session not found", 404);
  }

  const expiredAtValue = session.expired_at;

  return {
    id: session.id,
    discussion_board_memberuser_id: session.discussion_board_memberuser_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      expiredAtValue === null || expiredAtValue === undefined
        ? expiredAtValue
        : toISOStringSafe(expiredAtValue),
  };
}
