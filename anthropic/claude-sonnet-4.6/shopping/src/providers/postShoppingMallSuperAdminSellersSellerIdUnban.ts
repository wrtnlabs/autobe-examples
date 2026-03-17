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

export async function postShoppingMallSuperAdminSellersSellerIdUnban(props: {
  superAdmin: SuperadminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  // Step 1: Find the seller, ensuring they exist and are not deleted
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
    select: {
      id: true,
      is_banned: true,
    },
  });
  // Step 2: Idempotency check - reject if not currently banned
  if (seller.is_banned === false) {
    throw new HttpException("Seller is not currently banned", 422);
  }
  // Step 3: Perform the unban update
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_banned: false,
      updated_at: new Date(),
    },
  });
  // Step 4: Fetch updated record using the transformer
  const updated = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      ...ShoppingMallSellerTransformer.select(),
    },
  );
  // Step 5: Transform and return
  return ShoppingMallSellerTransformer.transform(updated);
}
