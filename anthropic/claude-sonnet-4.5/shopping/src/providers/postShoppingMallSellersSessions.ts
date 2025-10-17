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

export async function postShoppingMallSellersSessions(props: {
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.ILoginResponse> {
  const { body } = props;

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (!seller) {
    throw new HttpException("Invalid email or password", 401);
  }

  if (seller.account_status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  if (!seller.email_verified) {
    throw new HttpException("Email not verified", 403);
  }

  const nowTimestamp = Date.now();

  if (seller.account_locked_until !== null) {
    const lockoutExpiryTimestamp = new Date(
      seller.account_locked_until,
    ).getTime();
    if (lockoutExpiryTimestamp > nowTimestamp) {
      const remainingMinutes = Math.ceil(
        (lockoutExpiryTimestamp - nowTimestamp) / 60000,
      );
      throw new HttpException(
        `Account locked. Try again in ${remainingMinutes} minutes`,
        403,
      );
    }
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    seller.password_hash,
  );

  if (!isPasswordValid) {
    const windowStartTimestamp = seller.failed_login_window_start_at
      ? new Date(seller.failed_login_window_start_at).getTime()
      : null;

    let newFailedAttempts = seller.failed_login_attempts + 1;
    let newWindowStart: (string & tags.Format<"date-time">) | null =
      seller.failed_login_window_start_at
        ? toISOStringSafe(seller.failed_login_window_start_at)
        : null;
    let accountLockedUntil: (string & tags.Format<"date-time">) | null =
      seller.account_locked_until
        ? toISOStringSafe(seller.account_locked_until)
        : null;

    if (
      windowStartTimestamp !== null &&
      nowTimestamp - windowStartTimestamp > 15 * 60 * 1000
    ) {
      newFailedAttempts = 1;
      newWindowStart = toISOStringSafe(new Date(nowTimestamp));
    } else if (windowStartTimestamp === null) {
      newWindowStart = toISOStringSafe(new Date(nowTimestamp));
    }

    if (newFailedAttempts >= 5) {
      accountLockedUntil = toISOStringSafe(
        new Date(nowTimestamp + 30 * 60 * 1000),
      );
    }

    await MyGlobal.prisma.shopping_mall_sellers.update({
      where: { id: seller.id },
      data: {
        failed_login_attempts: newFailedAttempts,
        failed_login_window_start_at: newWindowStart,
        account_locked_until: accountLockedUntil,
        updated_at: toISOStringSafe(new Date(nowTimestamp)),
      },
    });

    throw new HttpException("Invalid email or password", 401);
  }

  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: seller.id },
    data: {
      failed_login_attempts: 0,
      failed_login_window_start_at: null,
      account_locked_until: null,
      updated_at: toISOStringSafe(new Date(nowTimestamp)),
    },
  });

  const accessTokenExpiryTimestamp = nowTimestamp + 30 * 60 * 1000;
  const refreshTokenExpiryTimestamp = nowTimestamp + 30 * 24 * 60 * 60 * 1000;

  const accessToken = jwt.sign(
    {
      sellerId: seller.id,
      email: seller.email,
      role: "seller",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m" },
  );

  const refreshToken = jwt.sign(
    {
      sellerId: seller.id,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d" },
  );

  const sessionId = v4() as string & tags.Format<"uuid">;

  await MyGlobal.prisma.shopping_mall_sessions.create({
    data: {
      id: sessionId,
      seller_id: seller.id,
      user_type: "seller",
      refresh_token: refreshToken,
      refresh_token_expires_at: toISOStringSafe(
        new Date(refreshTokenExpiryTimestamp),
      ),
      ip_address: "0.0.0.0",
      user_agent: "Unknown",
      device_type: null,
      device_name: null,
      browser_name: null,
      operating_system: null,
      approximate_location: null,
      is_revoked: false,
      revoked_at: null,
      last_activity_at: toISOStringSafe(new Date(nowTimestamp)),
      created_at: toISOStringSafe(new Date(nowTimestamp)),
    },
  });

  return {
    id: seller.id as string & tags.Format<"uuid">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessTokenExpiryTimestamp)),
      refreshable_until: toISOStringSafe(new Date(refreshTokenExpiryTimestamp)),
    },
  };
}
