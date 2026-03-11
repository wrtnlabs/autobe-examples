import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthMemberJoin(props: {
  ip: string;
  body: IDiscussionBoardMember.IJoin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create member record
  const now = new Date();
  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.displayName,
      bio: props.body.bio ?? null,
      ban_status: "active",
      ban_reason: null,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      bio: true,
      ban_status: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      _count: {
        select: {
          articles: true,
          comments: true,
        },
      },
      articles: {
        select: { id: true },
      } satisfies Prisma.discussion_board_articlesFindManyArgs,
      comments: {
        select: { id: true },
      } satisfies Prisma.discussion_board_commentsFindManyArgs,
    },
  });
  // 4. Generate email verification token
  const verificationToken = v4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  // 5. Create email verification record
  await MyGlobal.prisma.discussion_board_member_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: member.id,
      token: verificationToken,
      expires_at: toISOStringSafe(expiresAt),
      verified_at: null,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
  });
  // Note: Email sending is handled by external service, not implemented here
  // 6. Create session record
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
        expired_at: toISOStringSafe(accessExpires),
      },
    },
  );
  // 7. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;
  // 8. Return authorized response
  return {
    id: member.id,
    display_name: member.display_name,
    bio: member.bio ?? null,
    ban_status: member.ban_status,
    ban_reason: member.ban_reason ?? null,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    article_count: member._count.articles,
    comment_count: member._count.comments,
    email: props.body.email,
    access_token: token.access,
    refresh_token: token.refresh,
    token_type: "Bearer",
    expires_in: 3600,
    token,
  } satisfies IDiscussionBoardMember.IAuthorized;
}
