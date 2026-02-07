import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSessionsSessionId(props: {
  superAdmin: SuperadminPayload;
  sessionId: string;
}): Promise<IDiscussionBoardMemberSession> {
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findUnique({
      where: { id: props.sessionId },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  // Check if session is expired
  const now = new Date();
  if (session.expired_at <= now) {
    throw new HttpException("Session has expired", 404);
  }
  return {
    id: session.id,
    member_id: session.discussion_board_member_id,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
    last_activity_at: toISOStringSafe(session.last_activity_at),
    is_valid: session.is_valid,
    user_agent: session.user_agent ?? undefined,
    metadata: session.metadata ?? undefined,
    ip: session.ip,
    referrer: session.referrer ?? undefined,
    href: session.href ?? undefined,
  };
}
