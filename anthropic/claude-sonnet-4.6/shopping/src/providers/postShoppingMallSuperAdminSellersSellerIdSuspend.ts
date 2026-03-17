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

export async function postShoppingMallSuperAdminSellersSellerIdSuspend(props: {
  superAdmin: SuperadminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSeller> {
  // Step 1: Look up the seller, reject with 404 if not found or soft-deleted
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirstOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
    select: {
      id: true,
      is_banned: true,
      is_suspended: true,
    },
  });
  // Step 2: If seller is banned, reject the suspension
  if (seller.is_banned) {
    throw new HttpException("Cannot suspend a banned seller account", 409);
  }
  // Step 3: If seller is already suspended, reject duplicate state transition
  if (seller.is_suspended) {
    throw new HttpException("Seller account is already suspended", 409);
  }
  // Step 4: Apply suspension
  await MyGlobal.prisma.shopping_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      is_suspended: true,
      updated_at: new Date(),
    },
  });
  // Step 5: Fetch updated record and return as IShoppingMallSeller
  const updated = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      ...ShoppingMallSellerTransformer.select(),
    },
  );
  return await ShoppingMallSellerTransformer.transform(updated);
}
