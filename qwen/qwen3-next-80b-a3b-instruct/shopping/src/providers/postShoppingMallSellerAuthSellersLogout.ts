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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerAuthSellersLogout(props: {
  seller: SellerPayload;
}): Promise<void> {
  // Extract seller and session from payload
  const { id: sellerId, session_id: sessionId } = props.seller;
  // Validate session exists and is active before invalidating
  const session =
    await MyGlobal.prisma.shopping_mall_seller_sessions.findUnique({
      where: { id: sessionId },
    });
  // If session doesn't exist or already invalidated, return successfully (idempotent)
  if (!session || session.expired_at !== null) {
    return;
  }
  // Update session record to invalidate it
  await MyGlobal.prisma.shopping_mall_seller_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: toISOStringSafe(new Date()),
    },
  });
  // Return 204 No Content
  return;
}
