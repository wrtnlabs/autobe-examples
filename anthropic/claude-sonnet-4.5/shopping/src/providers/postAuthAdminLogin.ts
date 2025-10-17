import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminLogin(props: {
  body: IShoppingMallAdmin.ILogin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const { body } = props;

  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: body.email },
  });

  if (!admin) {
    throw new HttpException("Invalid email or password", 401);
  }

  if (!admin.is_active) {
    throw new HttpException("Account is not active", 403);
  }

  if (!admin.email_verified) {
    throw new HttpException(
      "Please verify your email address before logging in",
      403,
    );
  }

  const currentTime = new Date();
  if (admin.account_locked_until) {
    const lockoutTime = new Date(admin.account_locked_until);
    if (currentTime < lockoutTime) {
      const minutesRemaining = Math.ceil(
        (lockoutTime.getTime() - currentTime.getTime()) / 60000,
      );
      throw new HttpException(
        `Your account has been locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minutes or reset your password`,
        423,
      );
    }
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    admin.password_hash,
  );

  if (!isPasswordValid) {
    const windowStart = admin.failed_login_window_start_at
      ? new Date(admin.failed_login_window_start_at)
      : null;

    let newFailedAttempts = admin.failed_login_attempts + 1;
    let newWindowStartTime = windowStart;

    if (
      !windowStart ||
      currentTime.getTime() - windowStart.getTime() > 15 * 60 * 1000
    ) {
      newFailedAttempts = 1;
      newWindowStartTime = currentTime;
    }

    let lockoutTime = null;
    if (newFailedAttempts >= 5) {
      lockoutTime = new Date(currentTime.getTime() + 30 * 60 * 1000);
    }

    await MyGlobal.prisma.shopping_mall_admins.update({
      where: { id: admin.id },
      data: {
        failed_login_attempts: newFailedAttempts,
        failed_login_window_start_at: newWindowStartTime
          ? toISOStringSafe(newWindowStartTime)
          : null,
        account_locked_until: lockoutTime ? toISOStringSafe(lockoutTime) : null,
        updated_at: toISOStringSafe(currentTime),
      },
    });

    throw new HttpException("Invalid email or password", 401);
  }

  const loginTimeISO = toISOStringSafe(currentTime);
  await MyGlobal.prisma.shopping_mall_admins.update({
    where: { id: admin.id },
    data: {
      failed_login_attempts: 0,
      failed_login_window_start_at: null,
      last_login_at: loginTimeISO,
      last_login_ip: "0.0.0.0",
      updated_at: loginTimeISO,
    },
  });

  const accessTokenExpiry = new Date(currentTime.getTime() + 30 * 60 * 1000);
  const refreshTokenExpiry = new Date(
    currentTime.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const accessToken = jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      type: "admin",
      role_level: admin.role_level,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: admin.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  const sessionId = v4();
  await MyGlobal.prisma.shopping_mall_sessions.create({
    data: {
      id: sessionId,
      admin_id: admin.id,
      customer_id: null,
      seller_id: null,
      user_type: "admin",
      refresh_token: refreshToken,
      refresh_token_expires_at: toISOStringSafe(refreshTokenExpiry),
      ip_address: "0.0.0.0",
      user_agent: "Unknown",
      device_type: null,
      device_name: null,
      browser_name: null,
      operating_system: null,
      approximate_location: null,
      is_revoked: false,
      revoked_at: null,
      last_activity_at: loginTimeISO,
      created_at: loginTimeISO,
    },
  });

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role_level: admin.role_level,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
