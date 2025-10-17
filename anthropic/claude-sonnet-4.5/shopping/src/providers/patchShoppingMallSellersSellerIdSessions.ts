import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function patchShoppingMallSellersSellerIdSessions(props: {
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.ILoginResponse> {
  const { sellerId, body } = props;
  const currentTimeISO = toISOStringSafe(new Date());

  // Fetch seller by email
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { email: body.email },
  });

  // Generic error message for security (prevent email enumeration)
  if (!seller) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check if seller ID matches the path parameter
  if (seller.id !== sellerId) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check account lockout
  if (seller.account_locked_until !== null) {
    const lockUntilISO = toISOStringSafe(seller.account_locked_until);
    if (lockUntilISO > currentTimeISO) {
      throw new HttpException(
        "Account is locked due to multiple failed login attempts. Please try again later.",
        403,
      );
    }
  }

  // Check account status - must be active
  if (seller.account_status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // Check email verification
  if (!seller.email_verified) {
    throw new HttpException("Email address not verified", 403);
  }

  // Verify password
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    seller.password_hash,
  );

  if (!isPasswordValid) {
    // Handle failed login attempt - calculate 15 minutes ago
    const fifteenMinutesAgoISO = toISOStringSafe(
      new Date(new Date().getTime() - 15 * 60 * 1000),
    );

    const windowStart = seller.failed_login_window_start_at;
    let newFailedAttempts = seller.failed_login_attempts + 1;
    let newWindowStart = seller.failed_login_window_start_at;

    // Reset window if more than 15 minutes have passed or no window exists
    if (!windowStart || toISOStringSafe(windowStart) < fifteenMinutesAgoISO) {
      newFailedAttempts = 1;
      newWindowStart = new Date();
    }

    // Calculate lock time if 5 or more failed attempts
    const shouldLock = newFailedAttempts >= 5;
    const newLockUntil = shouldLock
      ? new Date(new Date().getTime() + 30 * 60 * 1000)
      : seller.account_locked_until;

    // Update failed login tracking
    await MyGlobal.prisma.shopping_mall_sellers.update({
      where: { id: seller.id },
      data: {
        failed_login_attempts: newFailedAttempts,
        failed_login_window_start_at: newWindowStart,
        account_locked_until: newLockUntil,
      },
    });

    throw new HttpException("Invalid credentials", 401);
  }

  // Password is valid - reset failed login attempts
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: seller.id },
    data: {
      failed_login_attempts: 0,
      failed_login_window_start_at: null,
      account_locked_until: null,
    },
  });

  // Generate JWT tokens with expiry times
  const accessExpiredAt = toISOStringSafe(
    new Date(new Date().getTime() + 30 * 60 * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000),
  );

  const accessToken = jwt.sign(
    {
      sellerId: seller.id,
      email: seller.email,
      role: "seller",
      type: "access",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m" },
  );

  const refreshToken = jwt.sign(
    {
      sellerId: seller.id,
      email: seller.email,
      role: "seller",
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d" },
  );

  // Create session record with generated tokens
  await MyGlobal.prisma.shopping_mall_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      seller_id: seller.id,
      user_type: "seller",
      refresh_token: refreshToken,
      refresh_token_expires_at: refreshExpiredAt,
      ip_address: "0.0.0.0",
      user_agent: "Unknown",
      device_type: null,
      device_name: null,
      browser_name: null,
      operating_system: null,
      approximate_location: null,
      is_revoked: false,
      revoked_at: null,
      last_activity_at: currentTimeISO,
      created_at: currentTimeISO,
    },
  });

  // Return authentication response
  return {
    id: seller.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiredAt,
      refreshable_until: refreshExpiredAt,
    },
  };
}
