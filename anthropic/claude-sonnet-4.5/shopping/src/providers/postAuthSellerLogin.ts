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

export async function postAuthSellerLogin(props: {
  body: IShoppingMallSeller.ILogin;
}): Promise<IShoppingMallSeller.IAuthorized> {
  const { body } = props;

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: body.email.toLowerCase(),
    },
  });

  if (!seller) {
    throw new HttpException("Invalid email or password", 401);
  }

  const nowTimestamp = Date.now();

  if (seller.account_locked_until) {
    const lockUntilTimestamp = new Date(seller.account_locked_until).getTime();
    if (lockUntilTimestamp > nowTimestamp) {
      const remainingMinutes = Math.ceil(
        (lockUntilTimestamp - nowTimestamp) / 60000,
      );
      throw new HttpException(
        `Account is locked. Please try again in ${remainingMinutes} minutes or reset your password.`,
        403,
      );
    }
  }

  if (!seller.email_verified) {
    throw new HttpException(
      "Email not verified. Please check your email for verification link.",
      403,
    );
  }

  if (seller.account_status !== "active") {
    const statusMessages = {
      pending_approval:
        "Account is pending approval. Please wait for admin verification.",
      suspended: "Account is suspended. Please contact support.",
      banned: "Account is banned. Please contact support.",
      on_hold: "Account is on hold. Please contact support.",
    };
    const message =
      statusMessages[seller.account_status as keyof typeof statusMessages] ||
      "Account is not active. Please contact support.";
    throw new HttpException(message, 403);
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    seller.password_hash,
  );

  if (!isPasswordValid) {
    const windowStartTimestamp = seller.failed_login_window_start_at
      ? new Date(seller.failed_login_window_start_at).getTime()
      : null;

    let newAttempts = seller.failed_login_attempts + 1;
    let newWindowStartTimestamp = windowStartTimestamp;
    let lockUntilTimestamp: number | null = null;

    if (!windowStartTimestamp || nowTimestamp - windowStartTimestamp > 900000) {
      newAttempts = 1;
      newWindowStartTimestamp = nowTimestamp;
    }

    if (newAttempts >= 5) {
      lockUntilTimestamp = nowTimestamp + 1800000;
    }

    await MyGlobal.prisma.shopping_mall_sellers.update({
      where: { id: seller.id },
      data: {
        failed_login_attempts: newAttempts,
        failed_login_window_start_at: newWindowStartTimestamp
          ? toISOStringSafe(new Date(newWindowStartTimestamp))
          : toISOStringSafe(new Date(nowTimestamp)),
        account_locked_until: lockUntilTimestamp
          ? toISOStringSafe(new Date(lockUntilTimestamp))
          : null,
      },
    });

    if (lockUntilTimestamp) {
      throw new HttpException(
        "Account locked due to too many failed login attempts. Please try again in 30 minutes or reset your password.",
        403,
      );
    }

    throw new HttpException("Invalid email or password", 401);
  }

  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: seller.id },
    data: {
      failed_login_attempts: 0,
      failed_login_window_start_at: null,
      account_locked_until: null,
    },
  });

  const accessTokenExpirationTimestamp = nowTimestamp + 3600000;
  const refreshTokenExpirationTimestamp = nowTimestamp + 604800000;

  const accessToken = jwt.sign(
    {
      id: seller.id,
      type: "seller",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: seller.id,
      type: "seller",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: seller.id,
    email: seller.email,
    business_name: seller.business_name,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessTokenExpirationTimestamp)),
      refreshable_until: toISOStringSafe(
        new Date(refreshTokenExpirationTimestamp),
      ),
    },
  };
}
