import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function postAuthSellerPasswordResetRequest(props: {
  body: IShoppingMallSeller.IPasswordResetRequest;
}): Promise<IShoppingMallSeller.IPasswordResetRequestResponse> {
  const { body } = props;

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: body.email,
    },
  });

  if (!seller) {
    return {
      message:
        "If an account exists with this email, you will receive password reset instructions",
    };
  }

  if (seller.account_status === "banned") {
    throw new HttpException(
      "This account is banned and cannot reset password. Please contact support.",
      403,
    );
  }

  const now = toISOStringSafe(new Date());
  if (
    seller.password_reset_expires_at &&
    toISOStringSafe(seller.password_reset_expires_at) > now
  ) {
    throw new HttpException(
      "A password reset request is already pending. Please check your email or wait for the token to expire.",
      429,
    );
  }

  const crypto = await import("crypto");

  const resetToken = crypto.randomBytes(32).toString("hex");

  const expirationTime = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));

  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: {
      id: seller.id,
    },
    data: {
      password_reset_token: resetToken,
      password_reset_expires_at: expirationTime,
    },
  });

  return {
    message:
      "If an account exists with this email, you will receive password reset instructions",
  };
}
