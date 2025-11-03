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

export async function postAuthMemberJoin(props: {
  body: IDiscussionBoardMember.IJoin;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const { body } = props;

  // Check for duplicate username
  const existingUsername =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: {
        username: body.username,
      },
    });

  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Check for duplicate email
  const existingEmail =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: {
        email: body.email,
      },
    });

  if (existingEmail) {
    throw new HttpException("Email already exists", 409);
  }

  // Hash password
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Create member record
  const now = toISOStringSafe(new Date());
  const memberId = v4() as string & tags.Format<"uuid">;

  const member = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: memberId,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      display_name: null,
      bio: null,
      location: null,
      website_url: null,
      profile_picture_url: null,
      email_verified: false,
      status: "pending_email_verification",
      profile_visibility: "public",
      activity_visibility: "public",
      last_login_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const session = await MyGlobal.prisma.discussion_board_member_sessions.create(
    {
      data: {
        id: sessionId,
        discussion_board_member_id: member.id,
        ip: body.ip ?? "",
        href: body.href,
        referrer: body.referrer,
        created_at: now,
        expired_at: toISOStringSafe(accessExpires),
      },
    },
  );

  // Generate JWT tokens
  const tokenCreatedAt = toISOStringSafe(new Date());

  const accessToken = jwt.sign(
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
  );

  const refreshToken = jwt.sign(
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
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return authorized member
  return {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    email: member.email as string & tags.Format<"email">,
    display_name:
      member.display_name === null ? undefined : member.display_name,
    bio: member.bio === null ? undefined : member.bio,
    location: member.location === null ? undefined : member.location,
    website_url:
      member.website_url === null
        ? undefined
        : (member.website_url as string & tags.Format<"uri">),
    profile_picture_url:
      member.profile_picture_url === null
        ? undefined
        : (member.profile_picture_url as string & tags.Format<"uri">),
    email_verified: member.email_verified,
    status: member.status,
    profile_visibility: member.profile_visibility,
    activity_visibility: member.activity_visibility,
    last_login_at:
      member.last_login_at === null
        ? undefined
        : toISOStringSafe(member.last_login_at),
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at === null
        ? undefined
        : toISOStringSafe(member.deleted_at),
    token,
  };
}
