import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallInventoryHistoryCollector } from "../collectors/ShoppingMallInventoryHistoryCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductVariantsVariantIdInventoryAdjust(props: {
  seller: SellerPayload;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryHistory.ICreate;
}): Promise<IShoppingMallInventoryHistory> {
  // Step 1: find variant with only shopping_mall_product_id
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  if (!variant) throw new HttpException("Product variant not found", 404);
  // Step 2: find shopping_mall_product to get seller_id
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: variant.shopping_mall_product_id },
    select: { seller_id: true },
  });
  if (!product) throw new HttpException("Product not found", 404);
  if (product.seller_id !== props.seller.id)
    throw new HttpException("Forbidden", 403);
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallInventoryHistoryCollector.collect({
      body: props.body,
      shoppingMallProductVariants: { id: props.variantId },
    });
    return await tx.shopping_mall_inventory_histories.create({
      data: {
        ...data,
        created_at: now,
        updated_at: now,
      },
    });
  });
  return {
    id: created.id,
    shopping_mall_product_variant_id: created.shopping_mall_product_variant_id,
    quantity_delta: created.quantity_delta,
    reason: created.reason,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
