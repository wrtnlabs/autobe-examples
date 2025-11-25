import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerShoppingMallSellersShoppingMallSellerIdShoppingMallSellerSessionsShoppingMallSellerSessionId(props: {
  seller: SellerPayload;
  shoppingMallSellerId: string & tags.Format<"uuid">;
  shoppingMallSellerSessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: {
        id: props.shoppingMallSellerSessionId,
      },
    });

  if (
    !session ||
    session.shopping_mall_seller_id !== props.shoppingMallSellerId
  ) {
    throw new HttpException("Seller session not found", 404);
  }

  return {
    id: session.id,
    shoppingMallSellerId: session.shopping_mall_seller_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    createdAt: toISOStringSafe(session.created_at),
    expiredAt: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
