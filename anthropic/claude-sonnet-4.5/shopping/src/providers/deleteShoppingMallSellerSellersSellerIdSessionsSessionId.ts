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
  const { seller, sellerId, sessionId } = props;

  // Authorization check: Ensure the authenticated seller matches the sellerId parameter
  if (seller.id !== sellerId) {
    throw new HttpException(
      "Forbidden: You can only manage your own sessions",
      403,
    );
  }

  // Find the session to verify it exists and belongs to this seller
  const session = await MyGlobal.prisma.shopping_mall_sessions.findFirst({
    where: {
      id: sessionId,
      seller_id: sellerId,
      user_type: "seller",
    },
  });

  // If session not found or doesn't belong to seller, return 404
  if (!session) {
    throw new HttpException(
      "Session not found or does not belong to this seller",
      404,
    );
  }

  // Terminate the session by marking it as revoked
  await MyGlobal.prisma.shopping_mall_sessions.update({
    where: {
      id: sessionId,
    },
    data: {
      is_revoked: true,
      revoked_at: toISOStringSafe(new Date()),
    },
  });
}
