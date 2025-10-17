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

export async function postAuthModeratorLogin(props: {
  body: IDiscussionBoardModerator.ILogin;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body } = props;

  const moderator =
    await MyGlobal.prisma.discussion_board_moderators.findUnique({
      where: { email: body.email },
    });

  if (!moderator) {
    const loginHistoryId = v4();
    const now = toISOStringSafe(new Date());

    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: loginHistoryId,
        discussion_board_member_id: null,
        discussion_board_moderator_id: null,
        discussion_board_administrator_id: null,
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "account_not_found",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        location: null,
        created_at: now,
      },
    });

    throw new HttpException("Invalid credentials", 401);
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    moderator.password_hash,
  );

  if (!isPasswordValid) {
    const loginHistoryId = v4();
    const now = toISOStringSafe(new Date());

    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: loginHistoryId,
        discussion_board_member_id: null,
        discussion_board_moderator_id: moderator.id,
        discussion_board_administrator_id: null,
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "incorrect_password",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        location: null,
        created_at: now,
      },
    });

    throw new HttpException("Invalid credentials", 401);
  }

  if (!moderator.email_verified) {
    const loginHistoryId = v4();
    const now = toISOStringSafe(new Date());

    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: loginHistoryId,
        discussion_board_member_id: null,
        discussion_board_moderator_id: moderator.id,
        discussion_board_administrator_id: null,
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "email_not_verified",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        location: null,
        created_at: now,
      },
    });

    throw new HttpException("Email not verified", 403);
  }

  if (moderator.account_status !== "active") {
    const loginHistoryId = v4();
    const now = toISOStringSafe(new Date());

    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: loginHistoryId,
        discussion_board_member_id: null,
        discussion_board_moderator_id: moderator.id,
        discussion_board_administrator_id: null,
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "account_suspended",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        location: null,
        created_at: now,
      },
    });

    throw new HttpException("Account is not active", 403);
  }

  if (!moderator.is_active) {
    const loginHistoryId = v4();
    const now = toISOStringSafe(new Date());

    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: loginHistoryId,
        discussion_board_member_id: null,
        discussion_board_moderator_id: moderator.id,
        discussion_board_administrator_id: null,
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "account_suspended",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        location: null,
        created_at: now,
      },
    });

    throw new HttpException("Moderator privileges are disabled", 403);
  }

  const now = toISOStringSafe(new Date());
  const accessExpiration = toISOStringSafe(
    new Date(Date.now() + 30 * 60 * 1000),
  );
  const refreshExpiration = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const accessToken = jwt.sign(
    {
      id: moderator.id,
      type: "moderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: moderator.id,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const sessionId = v4();
  const refreshTokenId = v4();

  await MyGlobal.prisma.discussion_board_sessions.create({
    data: {
      id: sessionId,
      discussion_board_member_id: null,
      discussion_board_moderator_id: moderator.id,
      discussion_board_administrator_id: null,
      access_token_hash: accessToken,
      device_type: "Unknown",
      browser_info: "Unknown",
      ip_address: "0.0.0.0",
      location: null,
      is_active: true,
      expires_at: accessExpiration,
      last_activity_at: now,
      created_at: now,
      revoked_at: null,
    },
  });

  await MyGlobal.prisma.discussion_board_refresh_tokens.create({
    data: {
      id: refreshTokenId,
      discussion_board_session_id: sessionId,
      refresh_token_hash: refreshToken,
      expires_at: refreshExpiration,
      is_revoked: false,
      created_at: now,
      revoked_at: null,
    },
  });

  const loginHistoryId = v4();
  await MyGlobal.prisma.discussion_board_login_history.create({
    data: {
      id: loginHistoryId,
      discussion_board_member_id: null,
      discussion_board_moderator_id: moderator.id,
      discussion_board_administrator_id: null,
      email_attempted: body.email,
      is_successful: true,
      failure_reason: null,
      ip_address: "0.0.0.0",
      device_type: "Unknown",
      browser_info: "Unknown",
      location: null,
      created_at: now,
    },
  });

  await MyGlobal.prisma.discussion_board_moderators.update({
    where: { id: moderator.id },
    data: {
      last_login_at: now,
      last_activity_at: now,
      updated_at: now,
    },
  });

  return {
    id: moderator.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiration,
      refreshable_until: refreshExpiration,
    },
  };
}
