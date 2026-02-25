import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerPaymentAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPaymentAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerPaymentAccountTransformer } from "../transformers/ShoppingMallSellerPaymentAccountTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerPaymentAccountSellerId(props: {
  seller: SellerPayload;
  sellerId: string;
}): Promise<IShoppingMallSellerPaymentAccount> {
  // Verify authorization - seller must own the account or be admin
  if (props.seller.id !== props.sellerId) {
    const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: props.seller.id },
    });
    if (!admin) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Query the payment account
  const paymentAccount =
    await MyGlobal.prisma.shopping_mall_seller_payment_accounts.findUnique({
      where: { seller_id: props.sellerId },
      ...ShoppingMallSellerPaymentAccountTransformer.select(),
    });
  if (!paymentAccount) {
    throw new HttpException("Payment account not found", 404);
  }
  // Transform to response DTO
  return await ShoppingMallSellerPaymentAccountTransformer.transform(
    paymentAccount,
  );
}
