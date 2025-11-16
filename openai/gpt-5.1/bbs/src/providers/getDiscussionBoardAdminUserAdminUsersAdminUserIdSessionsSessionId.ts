import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuserSession";
import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserAdminUsersAdminUserIdSessionsSessionId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string;
  sessionId: string;
}): Promise<IDiscussionBoardAdminuserSession> {
  // Ensure the authenticated admin is only accessing their own sessions
  if (props.adminUser.id !== props.adminUserId) {
    throw new HttpException("Forbidden to access another admin's session", 403);
  }

  // Look up the session, scoping by both admin user id and session id
  const session =
    await MyGlobal.prisma.discussion_board_adminuser_sessions.findFirst({
      where: {
        id: props.sessionId,
        discussion_board_adminuser_id: props.adminUserId,
      },
    });

  if (session === null) {
    throw new HttpException("Admin session not found", 404);
  }

  // No Prisma relation access or Date/Format casting issues to adjust here;
  // just map primitive fields using toISOStringSafe for any Date values.
  const adminUserSummary: IDiscussionBoardAdminuser.ISummary | undefined =
    undefined;

  return {
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null ? toISOStringSafe(session.expired_at) : null,
    adminUser: adminUserSummary,
  };
}
