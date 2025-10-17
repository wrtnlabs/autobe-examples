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

  // Find member by email (case-insensitive search)
  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  // Generic error message to prevent account enumeration
  if (!member) {
    throw new HttpException("Invalid email or password", 401);
  }

  // Check for account lockout before password verification (5 failed attempts in last 15 minutes)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const recentFailedAttempts =
    await MyGlobal.prisma.discussion_board_login_history.count({
      where: {
        discussion_board_member_id: member.id,
        is_successful: false,
        created_at: {
          gte: toISOStringSafe(fifteenMinutesAgo),
        },
      },
    });

  if (recentFailedAttempts >= 5) {
    throw new HttpException(
      "Account temporarily locked due to multiple failed login attempts. Please try again in 30 minutes.",
      403,
    );
  }

  // Verify password using PasswordUtil
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    member.password_hash,
  );

  if (!isPasswordValid) {
    // Record failed login attempt
    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_member_id: member.id,
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "incorrect_password",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        location: null,
        created_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Invalid email or password", 401);
  }

  // Check email verification status
  if (!member.email_verified) {
    throw new HttpException(
      "Email address not verified. Please check your email for verification link.",
      403,
    );
  }

  // Check account status
  if (member.account_status !== "active") {
    const statusMessages = {
      suspended: "Account is currently suspended",
      banned: "Account has been banned",
      deactivated: "Account has been deactivated",
      pending_verification: "Account is pending verification",
    };

    const message =
      statusMessages[member.account_status as keyof typeof statusMessages] ||
      "Account is not active";
    throw new HttpException(message, 403);
  }

  // Generate JWT tokens
  const now = new Date();
  const accessTokenExpiry = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
  const refreshTokenExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Create access token with member payload
  const accessToken = jwt.sign(
    {
      id: member.id,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Create refresh token
  const refreshToken = jwt.sign(
    {
      id: member.id,
      type: "member",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const nowISO = toISOStringSafe(now);
  const accessExpiryISO = toISOStringSafe(accessTokenExpiry);
  const refreshExpiryISO = toISOStringSafe(refreshTokenExpiry);

  await MyGlobal.prisma.discussion_board_sessions.create({
    data: {
      id: sessionId,
      discussion_board_member_id: member.id,
      access_token_hash: accessToken,
      device_type: "Unknown",
      browser_info: "Unknown",
      ip_address: "0.0.0.0",
      location: null,
      is_active: true,
      expires_at: accessExpiryISO,
      last_activity_at: nowISO,
      created_at: nowISO,
      revoked_at: null,
    },
  });

  // Create refresh token record
  await MyGlobal.prisma.discussion_board_refresh_tokens.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_session_id: sessionId,
      refresh_token_hash: refreshToken,
      expires_at: refreshExpiryISO,
      is_revoked: false,
      created_at: nowISO,
      revoked_at: null,
    },
  });

  // Update member's last login and activity timestamps
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: member.id },
    data: {
      last_login_at: nowISO,
      last_activity_at: nowISO,
      updated_at: nowISO,
    },
  });

  // Record successful login in history
  await MyGlobal.prisma.discussion_board_login_history.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: member.id,
      email_attempted: body.email,
      is_successful: true,
      failure_reason: null,
      ip_address: "0.0.0.0",
      device_type: "Unknown",
      browser_info: "Unknown",
      location: null,
      created_at: nowISO,
    },
  });

  // Return authorized member with tokens
  return {
    id: member.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiryISO,
      refreshable_until: refreshExpiryISO,
    },
  };
}
