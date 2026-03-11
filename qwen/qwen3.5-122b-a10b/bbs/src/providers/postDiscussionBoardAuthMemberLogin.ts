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

export async function postDiscussionBoardAuthMemberLogin(props: {
  ip: string;
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // 1. Find member by email with password_hash
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      bio: true,
      ban_status: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 2. Check if member exists
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Check if member is banned
  if (member.ban_status === "banned") {
    throw new HttpException(member.ban_reason ?? "Account is banned", 403);
  }
  // 4. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Calculate expiration timestamps
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const nowString = toISOStringSafe(now);
  const accessExpiresString = toISOStringSafe(accessExpires);
  const refreshExpiresString = toISOStringSafe(refreshExpires);
  // 6. Create new session
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: nowString,
        updated_at: nowString,
        expired_at: accessExpiresString,
      },
    },
  );
  // 7. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: nowString,
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
        created_at: nowString,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "30d", issuer: "autobe" },
    ),
    expired_at: accessExpiresString,
    refreshable_until: refreshExpiresString,
  };
  // 8. Update member's updated_at
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: member.id },
    data: {
      updated_at: nowString,
    },
  });
  // 9. Compute article and comment counts sequentially
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: {
      discussion_board_member_id: member.id,
      deleted_at: null,
    },
  });
  const commentCount = await MyGlobal.prisma.discussion_board_comments.count({
    where: {
      discussion_board_member_id: member.id,
      deleted_at: null,
    },
  });
  // 10. Return IAuthorized response
  const result: IDiscussionBoardMember.IAuthorized = {
    id: member.id,
    display_name: member.display_name,
    bio: member.bio,
    ban_status: member.ban_status,
    ban_reason: member.ban_reason,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    article_count: articleCount,
    comment_count: commentCount,
    email: member.email,
    access_token: token.access,
    refresh_token: token.refresh,
    token_type: "Bearer",
    expires_in: 3600,
    token,
  };
  return typia.assert<IDiscussionBoardMember.IAuthorized>(result);
}
