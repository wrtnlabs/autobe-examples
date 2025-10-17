import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function postAuthSellerVerificationResend(props: {
  body: IShoppingMallSeller.IResendVerificationRequest;
}): Promise<IShoppingMallSeller.IResendVerificationResponse> {
  const { body } = props;

  // Find seller by email
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      email: body.email,
    },
  });

  if (!seller) {
    throw new HttpException(
      "No seller account found with this email address",
      404,
    );
  }

  // Check if email is already verified
  if (seller.email_verified) {
    throw new HttpException("Email address is already verified", 400);
  }

  // Check if account is banned
  if (seller.account_status === "banned") {
    throw new HttpException(
      "Cannot send verification email to banned accounts",
      403,
    );
  }

  // Rate limiting check: 5 minutes must have passed since last email
  if (seller.email_verification_sent_at) {
    const nowTimestamp = Date.now();
    const lastSentDate = new Date(seller.email_verification_sent_at);
    const lastSentTimestamp = lastSentDate.getTime();
    const minutesElapsed = (nowTimestamp - lastSentTimestamp) / (1000 * 60);

    if (minutesElapsed < 5) {
      const remainingMinutes = Math.ceil(5 - minutesElapsed);
      throw new HttpException(
        `Please wait before requesting another verification email. You can request a new email in ${remainingMinutes} minutes`,
        429,
      );
    }
  }

  // Generate new secure verification token (32 bytes = 64 hex characters)
  const crypto = require("crypto");
  const newToken = crypto.randomBytes(32).toString("hex");

  // Current timestamp as ISO string
  const now = new Date();
  const currentTimestamp = toISOStringSafe(now);

  // Update seller with new token and timestamp
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: {
      id: seller.id,
    },
    data: {
      email_verification_token: newToken,
      email_verification_sent_at: currentTimestamp,
    },
  });

  return {
    message:
      "Verification email sent successfully. Please check your inbox and spam folder",
  };
}
