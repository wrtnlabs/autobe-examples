import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSellersSellerIdSellerSessionsSellerSessionId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  sellerSessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const session = await MyGlobal.prisma.shopping_mall_seller_sessions.findFirst(
    {
      where: {
        seller: { id: props.sellerId },
        id: props.sellerSessionId,
      },
    },
  );

  if (!session) {
    throw new HttpException("Seller session not found", 404);
  }

  await MyGlobal.prisma.shopping_mall_seller_sessions.delete({
    where: {
      seller: { id: props.sellerId },
      id: props.sellerSessionId,
    },
  });
}
