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
  const { body } = props;

  // Phase 1: Validate member credentials
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      OR: [
        { username: body.username_or_email },
        { email: body.username_or_email },
      ],
    },
  });

  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Verify password using PasswordUtil
  const isValid = await PasswordUtil.verify(
    body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check email verification
  if (!member.email_verified) {
    throw new HttpException(
      "Email verification required. Please verify your email before logging in.",
      403,
    );
  }

  // Check account status
  if (member.status !== "active") {
    if (member.status === "suspended") {
      throw new HttpException("Account is suspended", 403);
    }
    if (member.status === "deleted") {
      throw new HttpException("Account has been deleted", 403);
    }
    throw new HttpException("Account is not active", 403);
  }

  // Prepare timestamps
  const now = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresStr = toISOStringSafe(accessExpires);
  const refreshExpiresStr = toISOStringSafe(refreshExpires);

  // Update last login timestamp
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: member.id },
    data: {
      last_login_at: now,
    },
  });

  // Phase 2: Create NEW session record
  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: v4(),
        discussion_board_member_id: member.id,
        ip: body.ip ?? "0.0.0.0",
        href: body.href,
        referrer: body.referrer,
        created_at: now,
        expired_at: accessExpiresStr,
      },
    },
  );

  // Phase 3: Generate JWT tokens with exact payload structure
  const token = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpiresStr,
    refreshable_until: refreshExpiresStr,
  };

  // Return authorized member with token
  return {
    id: member.id,
    username: member.username,
    email: member.email,
    display_name: member.display_name ?? null,
    bio: member.bio ?? null,
    location: member.location ?? null,
    website_url: member.website_url ?? null,
    profile_picture_url: member.profile_picture_url ?? null,
    email_verified: member.email_verified,
    status: member.status,
    profile_visibility: member.profile_visibility,
    activity_visibility: member.activity_visibility,
    last_login_at: now,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token,
  };
}
