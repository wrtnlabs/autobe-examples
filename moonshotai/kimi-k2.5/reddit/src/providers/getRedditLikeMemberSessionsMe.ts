import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberSessionsMe(props: {
  member: MemberPayload;
}): Promise<IRedditLikeMemberSession> {
  const session =
    await MyGlobal.prisma.reddit_like_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        user_agent: true,
        created_at: true,
        expires_at: true,
        refresh_expires_at: true,
        member: {
          select: {
            id: true,
            email: true,
            username: true,
            email_verified: true,
            created_at: true,
          },
        },
      },
    });
  return {
    id: session.id,
    actorType: "member",
    actor: {
      id: session.member.id,
      email: session.member.email,
      username: session.member.username,
      emailVerified: session.member.email_verified,
      createdAt: toISOStringSafe(session.member.created_at),
    } satisfies IRedditLikeMember.ISummary,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    userAgent: session.user_agent,
    createdAt: toISOStringSafe(session.created_at),
    expiredAt: toISOStringSafe(session.refresh_expires_at),
    expiresAt: toISOStringSafe(session.expires_at),
  };
}
