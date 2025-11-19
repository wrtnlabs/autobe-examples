import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberLogin(props: {
  body: IDiscussionBoardMember.ILogin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  // Phase 1: Find member by email (case-insensitive)
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      email: props.body.email.toLowerCase(),
    },
  });

  if (!member) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Check if account is deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Check if account is suspended
  if (member.is_suspended) {
    const suspensionMessage = member.suspension_reason
      ? `Account is suspended: ${member.suspension_reason}`
      : "Account is suspended";
    throw new HttpException(suspensionMessage, 403);
  }

  // Phase 2: Verify password
  const isPasswordValid = await PasswordUtil.verify(
    props.body.password,
    member.password,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Phase 3: Update last login timestamp
  const now = new Date();
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: member.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });

  // Phase 4: Create new session
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: props.body.ip ?? "unknown",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: null,
      },
    },
  );

  // Phase 5: Generate JWT tokens
  const tokenCreatedAt = toISOStringSafe(now);

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: tokenCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpiresAt),
    refreshable_until: toISOStringSafe(refreshExpiresAt),
  };

  // Phase 6: Return authorized member with token
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    display_name:
      member.display_name === null ? undefined : member.display_name,
    bio: member.bio === null ? undefined : member.bio,
    avatar_url: member.avatar_url === null ? undefined : member.avatar_url,
    email_verified: member.email_verified,
    email_verified_at:
      member.email_verified_at === null
        ? undefined
        : toISOStringSafe(member.email_verified_at),
    is_suspended: member.is_suspended,
    suspension_reason:
      member.suspension_reason === null ? undefined : member.suspension_reason,
    suspended_until:
      member.suspended_until === null
        ? undefined
        : toISOStringSafe(member.suspended_until),
    last_login_at: toISOStringSafe(now),
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(now),
    deleted_at:
      member.deleted_at === null
        ? undefined
        : toISOStringSafe(member.deleted_at),
    token,
  };
}
