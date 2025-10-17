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

export async function postAuthCustomerRefresh(props: {
  body: IShoppingMallCustomer.IRefresh;
}): Promise<IShoppingMallCustomer.IAuthorized> {
  const { body } = props;

  // Step 1: Verify and decode the refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate decoded token structure with type guard
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("customerId" in decoded) ||
    !("type" in decoded) ||
    typeof decoded.customerId !== "string" ||
    typeof decoded.type !== "string"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }

  // TypeScript now knows decoded has customerId and type properties as strings
  const customerId = decoded.customerId;
  const tokenType = decoded.type;

  // Validate token type
  if (tokenType !== "refresh") {
    throw new HttpException("Invalid token type", 401);
  }

  // Step 2: Find and validate the session
  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      refresh_token: body.refresh_token,
      customer_id: customerId,
      user_type: "customer",
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 401);
  }

  // Step 3: Check if session is revoked
  if (session.is_revoked) {
    throw new HttpException("Session has been revoked", 401);
  }

  // Step 4: Check if refresh token is expired
  const nowTimestamp = Date.now();
  const refreshExpiresTimestamp = session.refresh_token_expires_at.getTime();

  if (refreshExpiresTimestamp < nowTimestamp) {
    throw new HttpException("Refresh token has expired", 401);
  }

  // Step 5: Retrieve customer information
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: customerId },
  });

  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  // Check if customer account is active
  if (customer.account_status !== "active") {
    throw new HttpException("Customer account is not active", 403);
  }

  // Step 6: Generate new access token (30 minutes expiration)
  const accessExpiresTimestamp = nowTimestamp + 30 * 60 * 1000;
  const accessExpirationDate = new Date(accessExpiresTimestamp);

  const newAccessToken = jwt.sign(
    {
      customerId: customer.id,
      email: customer.email,
      type: "access",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Step 7: Determine if refresh token needs rotation (within 7 days of expiration)
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const sevenDaysFromNowTimestamp = nowTimestamp + sevenDaysInMs;
  let newRefreshToken = session.refresh_token;
  let refreshExpiresDate = session.refresh_token_expires_at;

  if (refreshExpiresTimestamp < sevenDaysFromNowTimestamp) {
    // Generate new refresh token (30 days expiration)
    const newRefreshExpiresTimestamp = nowTimestamp + 30 * 24 * 60 * 60 * 1000;
    refreshExpiresDate = new Date(newRefreshExpiresTimestamp);

    newRefreshToken = jwt.sign(
      {
        customerId: customer.id,
        type: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "30d",
        issuer: "autobe",
      },
    );

    // Update session with new refresh token
    await MyGlobal.prisma.shopping_mall_sessions.update({
      where: { id: session.id },
      data: {
        refresh_token: newRefreshToken,
        refresh_token_expires_at: refreshExpiresDate,
        last_activity_at: new Date(nowTimestamp),
      },
    });
  } else {
    // Just update last_activity_at
    await MyGlobal.prisma.shopping_mall_sessions.update({
      where: { id: session.id },
      data: {
        last_activity_at: new Date(nowTimestamp),
      },
    });
  }

  // Step 8: Return response with new tokens
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessExpirationDate),
      refreshable_until: toISOStringSafe(refreshExpiresDate),
    },
  };
}
