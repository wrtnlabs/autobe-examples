import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerification";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerAuthSellersEmailVerify(props: {
  seller: SellerPayload;
  body: IShoppingMallSellerEmailVerification.IRequest;
}): Promise<void> {
  const verification =
    await MyGlobal.prisma.shopping_mall_seller_email_verifications.findFirst({
      where: {
        token: props.body.token,
        expired_at: { gt: toISOStringSafe(new Date()) },
      },
    });
  if (!verification) {
    throw new HttpException("Invalid or expired verification token", 400);
  }
  // Verify that this token belongs to the authenticated seller
  if (verification.seller_id !== props.seller.id) {
    throw new HttpException(
      "Invalid verification token for authenticated seller",
      403,
    );
  }
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.seller.id },
    data: { email_verified: true },
  });
  await MyGlobal.prisma.shopping_mall_seller_email_verifications.delete({
    where: { id: verification.id },
  });
}
