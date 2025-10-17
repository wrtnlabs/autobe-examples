import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthCustomerLogin(props: {
  body: IShoppingMallCustomer.ILogin;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const { body } = props;

  // Step 1: Find customer by email
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { email: body.email },
  });

  // Step 2: Generic error if customer doesn't exist (prevent account enumeration)
  if (!customer) {
    throw new HttpException("Invalid email or password", 403);
  }

  // Step 3: Validate account status
  if (customer.account_status !== "active") {
    throw new HttpException("Your account is inactive", 403);
  }

  // Step 4: Validate email verification
  if (!customer.email_verified) {
    throw new HttpException(
      "Please verify your email address before logging in",
      403,
    );
  }

  // Step 5: Check if account is currently locked
  const currentTime = new Date();
  if (customer.account_locked_until) {
    const lockUntilTime = new Date(customer.account_locked_until);
    if (lockUntilTime > currentTime) {
      throw new HttpException(
        "Your account has been locked due to multiple failed login attempts. Please try again in 30 minutes or reset your password",
        403,
      );
    }
  }

  // Step 6: Verify password
  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    customer.password_hash,
  );

  if (!isPasswordValid) {
    // Handle failed login attempt with 15-minute window logic
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const windowStart = customer.failed_login_window_start_at
      ? new Date(customer.failed_login_window_start_at)
      : null;

    let newFailedAttempts = customer.failed_login_attempts + 1;
    let newWindowStart = currentTime;

    // Reset counter if window expired or no window exists
    if (!windowStart || windowStart < fifteenMinutesAgo) {
      newFailedAttempts = 1;
      newWindowStart = currentTime;
    }

    // Lock account if 5 failures within window
    const shouldLock = newFailedAttempts >= 5;
    const lockUntilTime = shouldLock
      ? new Date(Date.now() + 30 * 60 * 1000)
      : null;

    // Update failed login tracking
    await MyGlobal.prisma.shopping_mall_customers.update({
      where: { id: customer.id },
      data: {
        failed_login_attempts: newFailedAttempts,
        failed_login_window_start_at: toISOStringSafe(newWindowStart),
        account_locked_until: lockUntilTime
          ? toISOStringSafe(lockUntilTime)
          : null,
        updated_at: toISOStringSafe(currentTime),
      },
    });

    if (shouldLock) {
      throw new HttpException(
        "Your account has been locked due to multiple failed login attempts. Please try again in 30 minutes or reset your password",
        403,
      );
    }

    throw new HttpException("Invalid email or password", 403);
  }

  // Step 7: Reset failed login attempts on successful login
  const nowString = toISOStringSafe(currentTime);
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customer.id },
    data: {
      failed_login_attempts: 0,
      failed_login_window_start_at: null,
      updated_at: nowString,
    },
  });

  // Step 8: Generate JWT tokens
  const accessTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
  const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      userId: customer.id,
      email: customer.email,
      role: "customer",
      type: "access",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: customer.id,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  // Step 9: Create session record
  await MyGlobal.prisma.shopping_mall_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      customer_id: customer.id,
      user_type: "customer",
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
      last_activity_at: nowString,
      created_at: nowString,
    },
  });

  // Step 10: Return authorized customer with tokens
  return {
    id: customer.id as string & tags.Format<"uuid">,
    email: customer.email as string & tags.Format<"email">,
    name: customer.name,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
