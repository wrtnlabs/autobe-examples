import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: IDiscussionBoardModerator.ICreate;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body } = props;

  // Check for duplicate username (without case-insensitive mode for SQLite compatibility)
  const existingUsername =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        username: body.username,
      },
    });

  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Check for duplicate email (without case-insensitive mode for SQLite compatibility)
  const existingEmail =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: {
        email: body.email,
      },
    });

  if (existingEmail) {
    throw new HttpException("Email already exists", 409);
  }

  // Hash password
  const hashedPassword: string = await PasswordUtil.hash(body.password);

  // Create moderator record
  const now = toISOStringSafe(new Date());
  const moderatorId = v4() as string & tags.Format<"uuid">;

  const moderator = await MyGlobal.prisma.discussion_board_moderators.create({
    data: {
      id: moderatorId,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      display_name: body.display_name ?? null,
      bio: body.bio ?? null,
      location: body.location ?? null,
      website_url: body.website_url ?? null,
      profile_picture_url: body.profile_picture_url ?? null,
      email_verified: false,
      status: "pending_email_verification",
      moderation_permissions: JSON.stringify({
        can_edit_articles: true,
        can_delete_articles: true,
        can_edit_comments: true,
        can_delete_comments: true,
        can_issue_warnings: true,
        can_suspend_users: true,
        can_ban_users: false,
        can_manage_reports: true,
        can_manage_categories: false,
      }),
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

  const session =
    await MyGlobal.prisma.discussion_board_moderator_sessions.create({
      data: {
        id: sessionId,
        discussion_board_moderator_id: moderator.id,
        ip: body.ip ?? "",
        href: body.href,
        referrer: body.referrer,
        created_at: now,
        expired_at: toISOStringSafe(accessExpires),
      },
    });

  // Generate JWT tokens
  const tokenCreatedAt = toISOStringSafe(new Date());

  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: moderator.id,
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
      type: "moderator",
      id: moderator.id,
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

  // Return authorized moderator with tokens
  return {
    id: moderator.id,
    username: moderator.username,
    email: moderator.email,
    display_name: moderator.display_name ?? null,
    bio: moderator.bio ?? null,
    location: moderator.location ?? null,
    website_url: moderator.website_url ?? null,
    profile_picture_url: moderator.profile_picture_url ?? null,
    email_verified: moderator.email_verified,
    status: moderator.status,
    moderation_permissions: moderator.moderation_permissions,
    profile_visibility: moderator.profile_visibility,
    activity_visibility: moderator.activity_visibility,
    last_login_at: moderator.last_login_at
      ? toISOStringSafe(moderator.last_login_at)
      : null,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at: moderator.deleted_at
      ? toISOStringSafe(moderator.deleted_at)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
