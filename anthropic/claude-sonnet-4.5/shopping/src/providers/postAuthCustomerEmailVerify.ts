import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

export async function postAuthCustomerEmailVerify(props: {
  body: IShoppingMallCustomer.IEmailVerification;
}): Promise<IShoppingMallCustomer.IEmailVerificationResponse> {
  const { body } = props;

  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      email_verification_token: body.token,
      deleted_at: null,
    },
  });

  if (!customer) {
    throw new HttpException(
      "Invalid or expired verification token. Please request a new verification email.",
      400,
    );
  }

  if (!customer.email_verification_sent_at) {
    throw new HttpException(
      "Invalid or expired verification token. Please request a new verification email.",
      400,
    );
  }

  const nowTimestamp = Date.now();
  const sentAtTimestamp = new Date(
    customer.email_verification_sent_at,
  ).getTime();
  const expirationTimestamp = sentAtTimestamp + 24 * 60 * 60 * 1000;

  if (nowTimestamp > expirationTimestamp) {
    throw new HttpException(
      "Invalid or expired verification token. Please request a new verification email.",
      400,
    );
  }

  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customer.id },
    data: {
      email_verified: true,
      account_status: "active",
      email_verification_token: null,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    message:
      "Your email has been verified! You can now access all platform features.",
  };
}
