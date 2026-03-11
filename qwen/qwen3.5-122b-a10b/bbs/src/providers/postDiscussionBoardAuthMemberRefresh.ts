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

export async function postDiscussionBoardAuthMemberRefresh(props: {
  body: IDiscussionBoardMember.IRefresh;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // 1. Verify refresh token JWT signature and expiration
  let decoded: {
    member_id: string;
    session_id: string;
    type: "refresh";
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "refresh") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Verify member exists and is not deleted
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: decoded.member_id },
  });
  if (!member) {
    throw new HttpException("Member not found", 401);
  }
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 4. Check member ban_status is 'active'
  if (member.ban_status === "banned") {
    throw new HttpException(member.ban_reason ?? "Account is banned", 403);
  }
  // 5. Find valid session where session_id matches and expired_at > now()
  const now = new Date();
  const session =
    await MyGlobal.prisma.discussion_board_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_member_id: decoded.member_id,
        expired_at: {
          gt: now,
        },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 6. Generate new tokens with same session_id (token rotation)
  const accessExpires = new Date(Date.now() + 30 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      member_id: decoded.member_id,
      email: member.email,
      display_name: member.display_name,
      ban_status: member.ban_status,
      role: "member",
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      member_id: decoded.member_id,
      session_id: decoded.session_id,
      type: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // 7. Update session updated_at timestamp
  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: { id: session.id },
    data: { updated_at: new Date() },
  });
  // 8. Compute article_count and comment_count
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_member_id: decoded.member_id,
      deleted_at: null,
    },
  });
  const commentCount = await MyGlobal.prisma.discussion_board_comments.count({
    where: {
      discussion_board_member_id: decoded.member_id,
      deleted_at: null,
    },
  });
  // 9. Return IAuthorized response
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    display_name: member.display_name,
    bio: member.bio,
    ban_status: member.ban_status,
    ban_reason: member.ban_reason,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    article_count: articleCount as number & tags.Type<"int32">,
    comment_count: commentCount as number & tags.Type<"int32">,
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: 1800 as number & tags.Type<"int32"> & tags.Minimum<0>,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  } satisfies IDiscussionBoardMember.IAuthorized;
}
