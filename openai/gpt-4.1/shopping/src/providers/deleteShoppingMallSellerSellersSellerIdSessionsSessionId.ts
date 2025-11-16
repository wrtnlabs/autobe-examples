import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerSellersSellerIdSessionsSessionId(props: {
  seller: SellerPayload;
  sellerId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check the session exists and is owned by this seller
  const session =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: { id: props.sessionId },
    });
  if (!session) {
    throw new HttpException("Session not found.", 404);
  }
  if (
    session.shopping_mall_seller_id !== props.seller.id ||
    props.seller.id !== props.sellerId
  ) {
    throw new HttpException(
      "You do not have permission to delete this session.",
      403,
    );
  }
  await MyGlobal.prisma.shopping_mall_seller_sessions.delete({
    where: { id: props.sessionId },
  });
}
