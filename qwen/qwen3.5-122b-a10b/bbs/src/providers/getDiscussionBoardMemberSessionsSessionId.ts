import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { DiscussionBoardMemberSessionTransformer } from "../transformers/DiscussionBoardMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberSession> {
  // Find the session with ownership check in one query
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirstOrThrow({
      where: {
        id: props.sessionId,
        discussion_board_member_id: props.member.id,
      },
      select: {
        id: true,
        discussion_board_member_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
      },
    });
  // Check if session is expired
  const now = new Date();
  if (session.expired_at <= now) {
    throw new HttpException("Session expired", 401);
  }
  // Check if member is banned
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: { ban_status: true },
  });
  if (member === null || member.ban_status === "banned") {
    throw new HttpException("Forbidden", 403);
  }
  // Get full session with member summary using transformer
  const fullSession =
    await MyGlobal.prisma.discussion_board_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...DiscussionBoardMemberSessionTransformer.select(),
    });
  return await DiscussionBoardMemberSessionTransformer.transform(fullSession);
}
