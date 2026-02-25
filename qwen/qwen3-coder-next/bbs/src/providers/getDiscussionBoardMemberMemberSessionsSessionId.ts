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

export async function getDiscussionBoardMemberMemberSessionsSessionId(props: {
  member: MemberPayload;
  sessionId: string;
}): Promise<IDiscussionBoardMemberSession> {
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        last_active_at: true,
        ip: true,
        headers: true,
        access_token: true,
        expired_at: true,
        refresh_token: true,
        token_issued_at: true,
        token_version: true,
        refresh_token_issued_at: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            bio: true,
            is_active: true,
            is_admin: true,
            is_super_admin: true,
            created_at: true,
            updated_at: true,
            password_hash: true,
            comments: {
              select: { id: true },
            },
            passwordResets: {
              select: { id: true },
            },
            emailVerification: {
              select: { id: true },
            },
            sessions: {
              select: { id: true },
            },
            articles: {
              select: { id: true },
            },
          },
        },
      },
    });
  if (session.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await DiscussionBoardMemberSessionTransformer.transform(session);
}
