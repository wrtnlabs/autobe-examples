import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminVerificationToken(props: {
  admin: AdminPayload;
  token: string;
}): Promise<IShoppingMallCustomerEmailVerification> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;
  const customerVerification =
    await MyGlobal.prisma.shopping_mall_customer_email_verifications.findFirst({
      where: {
        token: props.token,
        deleted_at: null,
        expires_at: { gt: now },
      },
    });
  if (customerVerification) {
    return { type: "customer", status: "valid" };
  }
  const sellerVerification =
    await MyGlobal.prisma.shopping_mall_seller_email_verifications.findFirst({
      where: {
        email_verification_token: props.token,
        deleted_at: null,
        expires_at: { gt: now },
      },
    });
  if (sellerVerification) {
    return { type: "seller", status: "valid" };
  }
  return { type: null, status: "invalid" };
}
