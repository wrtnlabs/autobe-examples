import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postAuthCustomerEmailVerifyResend(props: {
  body: IShoppingMallCustomer.IResendVerification;
}): Promise<IShoppingMallCustomer.IResendVerificationResponse> {
  const { body } = props;

  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { email: body.email },
    select: {
      id: true,
      email: true,
      email_verified: true,
      email_verification_sent_at: true,
      account_status: true,
    },
  });

  if (!customer) {
    return {
      message:
        "If your email is registered and unverified, you will receive a new verification link",
    };
  }

  if (customer.email_verified) {
    throw new HttpException(
      "This email address has already been verified. You can log in to your account.",
      400,
    );
  }

  if (
    customer.account_status !== "unverified" &&
    customer.account_status !== "active"
  ) {
    return {
      message:
        "If your email is registered and unverified, you will receive a new verification link",
    };
  }

  if (customer.email_verification_sent_at) {
    const currentTimestamp = Date.now();
    const lastSentTimestamp = new Date(
      customer.email_verification_sent_at,
    ).getTime();
    const minutesSinceLastSent =
      (currentTimestamp - lastSentTimestamp) / (1000 * 60);

    if (minutesSinceLastSent < 5) {
      throw new HttpException(
        "Verification email was recently sent. Please wait a few minutes before requesting another one.",
        429,
      );
    }
  }

  const newToken = v4();
  const currentTime = toISOStringSafe(new Date());

  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customer.id },
    data: {
      email_verification_token: newToken,
      email_verification_sent_at: currentTime,
      updated_at: currentTime,
    },
  });

  return {
    message:
      "If your email is registered and unverified, you will receive a new verification link",
  };
}
