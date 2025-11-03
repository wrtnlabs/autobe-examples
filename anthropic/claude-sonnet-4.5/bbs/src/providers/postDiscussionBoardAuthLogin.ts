import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postDiscussionBoardAuthLogin(props: {
  body: IDiscussionBoardAuth.ILogin;
}): Promise<IDiscussionBoardAuth.ILoginResult> {
  const { body } = props;

  // Search for user in members table
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      OR: [
        { username: body.username_or_email },
        { email: body.username_or_email },
      ],
      deleted_at: null,
    },
  });

  // Search for user in moderators table if not found in members
  const moderator = !member
    ? await MyGlobal.prisma.discussion_board_moderators.findFirst({
        where: {
          OR: [
            { username: body.username_or_email },
            { email: body.username_or_email },
          ],
          deleted_at: null,
        },
      })
    : null;

  // Verify user exists
  if (!member && !moderator) {
    throw new HttpException("Invalid username or password", 401);
  }

  const user = member || moderator!;
  const userRole = member ? "member" : "moderator";

  // Verify password
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new HttpException("Invalid username or password", 401);
  }

  // Verify email is verified
  if (!user.email_verified) {
    throw new HttpException(
      "Email address must be verified before logging in",
      403,
    );
  }

  // Verify account status is active
  if (user.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // Update last_login_at
  const now = toISOStringSafe(new Date());
  if (member) {
    await MyGlobal.prisma.discussion_board_members.update({
      where: { id: user.id },
      data: { last_login_at: now },
    });
  } else {
    await MyGlobal.prisma.discussion_board_moderators.update({
      where: { id: user.id },
      data: { last_login_at: now },
    });
  }

  // Create session record
  const sessionId = v4();
  const sessionIp = body.ip !== null && body.ip !== undefined ? body.ip : "";
  const sessionData = {
    id: sessionId,
    ip: sessionIp,
    href: body.href,
    referrer: body.referrer,
    created_at: now,
    expired_at: null,
  };

  if (member) {
    await MyGlobal.prisma.discussion_board_member_sessions.create({
      data: {
        ...sessionData,
        discussion_board_member_id: user.id,
      },
    });
  } else {
    await MyGlobal.prisma.discussion_board_moderator_sessions.create({
      data: {
        ...sessionData,
        discussion_board_moderator_id: user.id,
      },
    });
  }

  // Generate JWT tokens
  const accessTokenExpiry = new Date();
  accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 30);
  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);

  const tokenPayload = {
    id: user.id,
    role: userRole,
    username: user.username,
    email_verified: user.email_verified,
  };

  const accessToken = jwt.sign(
    { ...tokenPayload, exp: Math.floor(accessTokenExpiry.getTime() / 1000) },
    MyGlobal.env.JWT_SECRET_KEY,
  );

  const refreshToken = jwt.sign(
    { ...tokenPayload, exp: Math.floor(refreshTokenExpiry.getTime() / 1000) },
    MyGlobal.env.JWT_SECRET_KEY,
  );

  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessTokenExpiry),
    refreshable_until: toISOStringSafe(refreshTokenExpiry),
  };

  // Return login result
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name ?? null,
    email: user.email,
    email_verified: user.email_verified,
    role: userRole,
    status: user.status,
    profile_visibility: user.profile_visibility,
    activity_visibility: user.activity_visibility,
    bio: user.bio ?? null,
    location: user.location ?? null,
    website_url: user.website_url ?? null,
    profile_picture_url: user.profile_picture_url ?? null,
    last_login_at: now,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    moderation_permissions: moderator?.moderation_permissions ?? null,
    token,
  };
}
