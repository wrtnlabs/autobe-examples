import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerShoppingMallSellersShoppingMallSellerIdShoppingMallSellerSessionsShoppingMallSellerSessionId(props: {
  seller: SellerPayload;
  shoppingMallSellerId: string;
  shoppingMallSellerSessionId: string;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: { id: props.shoppingMallSellerSessionId },
    });

  if (session === null) {
    throw new HttpException("Seller session not found", 404);
  }

  if (session.shopping_mall_seller_id !== props.shoppingMallSellerId) {
    throw new HttpException("Forbidden: seller does not own this session", 403);
  }

  await MyGlobal.prisma.shopping_mall_seller_sessions.delete({
    where: { id: props.shoppingMallSellerSessionId },
  });
}
