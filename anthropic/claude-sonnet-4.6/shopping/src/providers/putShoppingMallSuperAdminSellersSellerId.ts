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

export async function putShoppingMallSuperAdminSellersSellerId(props: {
  superAdmin: SuperadminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IShoppingMallSeller.IUpdate;
}): Promise<IShoppingMallSeller> {
  // Step 1: Verify seller exists and is not soft-deleted
  await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: {
      id: props.sellerId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Execute update + snapshot creation in a single transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 2a. Update shop_name and updated_at on the seller record
    await tx.shopping_mall_sellers.update({
      where: { id: props.sellerId },
      data: {
        shop_name: props.body.shopName,
        updated_at: new Date(),
      },
    });
    // 2b. Insert a new immutable profile snapshot
    await tx.shopping_mall_seller_profile_snapshots.create({
      data: {
        id: v4(),
        seller: { connect: { id: props.sellerId } },
        shop_name: props.body.shopName,
        shop_description: props.body.shopDescription ?? null,
        logo_url: props.body.logoUrl ?? null,
        created_at: new Date(),
      },
    });
  });
  // Step 3: Fetch and return the updated seller entity
  const updated = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      ...ShoppingMallSellerTransformer.select(),
    },
  );
  return ShoppingMallSellerTransformer.transform(updated);
}
