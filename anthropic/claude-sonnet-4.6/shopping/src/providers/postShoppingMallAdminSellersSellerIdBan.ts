import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminSellersSellerIdBan(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  // Step 1: Look up seller, ensure it exists and is not soft-deleted
  const existing = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
    select: {
      id: true,
      is_banned: true,
    },
  });
  if (existing === null) {
    throw new HttpException("Seller not found", 404);
  }
  // Step 2: Idempotency guard — reject if already banned
  if (existing.is_banned === true) {
    throw new HttpException("Seller is already banned", 409);
  }
  // Step 3: Execute ban within a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 3a. Set is_banned = true and update updated_at
    await tx.shopping_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        is_banned: true,
        updated_at: new Date(),
      },
    });
    // 3b. Invalidate all active sessions by deleting them
    await tx.shopping_mall_seller_sessions.deleteMany({
      where: { shopping_mall_seller_id: props.sellerId },
    });
  });
  // Step 4: Fetch updated seller and return via transformer
  const updated = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      ...ShoppingMallSellerTransformer.select(),
    },
  );
  return ShoppingMallSellerTransformer.transform(updated);
}
