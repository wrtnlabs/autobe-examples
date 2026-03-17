import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSuperAdminSellersSellerIdBan(props: {
  superAdmin: SuperadminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  // Step 1: Fetch the seller record (404 if not found)
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.sellerId },
    select: {
      id: true,
      is_banned: true,
      deleted_at: true,
    },
  });
  // Step 2: Treat soft-deleted accounts as non-existent
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }
  // Step 3: Idempotency check — already banned
  if (seller.is_banned === true) {
    throw new HttpException("Seller is already banned", 409);
  }
  // Step 4: Ban the seller + invalidate sessions in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        is_banned: true,
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_seller_sessions.deleteMany({
      where: { shopping_mall_seller_id: props.sellerId },
    });
  });
  // Step 5: Fetch the updated record using the transformer's select
  const updated = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      ...ShoppingMallSellerTransformer.select(),
    },
  );
  // Step 6: Return transformed DTO
  return ShoppingMallSellerTransformer.transform(updated);
}
