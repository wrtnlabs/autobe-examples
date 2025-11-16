import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerSellersSellerIdSellerSessionsSellerSessionId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  sellerSessionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSellerSession> {
  const session =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: { id: props.sellerSessionId },
    });

  if (session === null || session.shopping_mall_seller_id !== props.sellerId) {
    throw new HttpException("Seller session not found", 404);
  }

  return {
    id: session.id,
    seller_id: session.shopping_mall_seller_id,
    ip: session.ip === null ? undefined : (session.ip ?? undefined),
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expires_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };
}
