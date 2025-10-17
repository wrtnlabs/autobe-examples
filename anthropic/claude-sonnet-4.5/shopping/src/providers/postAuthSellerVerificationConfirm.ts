import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function postAuthSellerVerificationConfirm(props: {
  body: IShoppingMallSeller.IVerifyEmail;
}): Promise<IShoppingMallSeller.IVerifyEmailResponse> {
  const { body } = props;

  // Find seller by verification token
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email_verification_token: body.token,
    },
  });

  // Validate token exists
  if (!seller) {
    throw new HttpException(
      "Invalid or expired verification token. Please request a new verification email",
      400,
    );
  }

  // Validate token not expired (24-hour lifetime)
  if (!seller.email_verification_sent_at) {
    throw new HttpException(
      "Invalid or expired verification token. Please request a new verification email",
      400,
    );
  }

  const currentTime = new Date();
  const sentTime = new Date(seller.email_verification_sent_at);
  const tokenAgeMs = currentTime.getTime() - sentTime.getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;

  if (tokenAgeMs >= twentyFourHoursMs) {
    throw new HttpException(
      "Verification link has expired. Please request a new verification email",
      400,
    );
  }

  // Update seller: mark email as verified and clear verification token
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: seller.id },
    data: {
      email_verified: true,
      email_verification_token: null,
      email_verification_sent_at: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    message:
      "Email verified successfully. Your account is pending administrator approval",
  };
}
