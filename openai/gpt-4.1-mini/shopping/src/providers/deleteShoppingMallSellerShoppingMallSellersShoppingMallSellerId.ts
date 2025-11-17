import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerShoppingMallSellersShoppingMallSellerId(props: {
  seller: SellerPayload;
  shoppingMallSellerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.shoppingMallSellerId },
  });

  if (!existing) {
    throw new HttpException("Seller not found", 404);
  }

  if (existing.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.shopping_mall_sellers.delete({
    where: { id: props.shoppingMallSellerId },
  });
}
