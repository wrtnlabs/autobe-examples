import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerVerificationToken(props: {
  seller: SellerPayload;
  token: string;
}): Promise<IShoppingMallCustomerEmailVerification> {
  const now = new Date().toISOString();
  // Query using correct field name: email_verification_token
  const verification =
    await MyGlobal.prisma.shopping_mall_seller_email_verifications.findFirst({
      where: {
        email_verification_token: props.token,
        deleted_at: null,
        expires_at: { gt: now },
      },
    });
  if (verification) {
    return { type: "seller", status: "valid" };
  }
  return { type: null, status: "invalid" };
}
