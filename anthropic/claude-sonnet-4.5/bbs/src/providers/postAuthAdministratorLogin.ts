import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdministratorLogin(props: {
  body: IDiscussionBoardAdministrator.ILogin;
}): Promise<IDiscussionBoardAdministrator.IAuthorized> {
  const { body } = props;

  const administrator =
    await MyGlobal.prisma.discussion_board_administrators.findFirst({
      where: {
        OR: [{ email: body.email }, { username: body.email }],
      },
    });

  if (!administrator) {
    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: v4(),
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "account_not_found",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  if (administrator.account_status !== "active") {
    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: v4(),
        discussion_board_administrator_id: administrator.id,
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "account_not_active",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new HttpException("Account is not active", 403);
  }

  if (!administrator.email_verified) {
    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: v4(),
        discussion_board_administrator_id: administrator.id,
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "email_not_verified",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new HttpException("Email not verified", 403);
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    administrator.password_hash,
  );

  if (!isPasswordValid) {
    await MyGlobal.prisma.discussion_board_login_history.create({
      data: {
        id: v4(),
        discussion_board_administrator_id: administrator.id,
        email_attempted: body.email,
        is_successful: false,
        failure_reason: "incorrect_password",
        ip_address: "0.0.0.0",
        device_type: "Unknown",
        browser_info: "Unknown",
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  const now = toISOStringSafe(new Date());

  const accessTokenExpiry = new Date();
  accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 30);
  const accessExpiresAt = toISOStringSafe(accessTokenExpiry);

  const refreshTokenExpiry = new Date();
  refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7);
  const refreshExpiresAt = toISOStringSafe(refreshTokenExpiry);

  const accessToken = jwt.sign(
    {
      id: administrator.id,
      type: "administrator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: administrator.id,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const sessionId = v4();

  await MyGlobal.prisma.discussion_board_sessions.create({
    data: {
      id: sessionId,
      discussion_board_administrator_id: administrator.id,
      access_token_hash: accessToken,
      device_type: "Unknown",
      browser_info: "Unknown",
      ip_address: "0.0.0.0",
      is_active: true,
      expires_at: accessExpiresAt,
      last_activity_at: now,
      created_at: now,
    },
  });

  await MyGlobal.prisma.discussion_board_refresh_tokens.create({
    data: {
      id: v4(),
      discussion_board_session_id: sessionId,
      refresh_token_hash: refreshToken,
      expires_at: refreshExpiresAt,
      is_revoked: false,
      created_at: now,
    },
  });

  await MyGlobal.prisma.discussion_board_login_history.create({
    data: {
      id: v4(),
      discussion_board_administrator_id: administrator.id,
      email_attempted: body.email,
      is_successful: true,
      ip_address: "0.0.0.0",
      device_type: "Unknown",
      browser_info: "Unknown",
      created_at: now,
    },
  });

  await MyGlobal.prisma.discussion_board_administrators.update({
    where: { id: administrator.id },
    data: {
      last_login_at: now,
      last_activity_at: now,
      updated_at: now,
    },
  });

  return {
    id: administrator.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
