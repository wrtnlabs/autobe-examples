import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        product_description: true,
        category_id: true,
        category_name: true,
        base_price: true,
        thumbnail_image_url: true,
        all_product_images: true,
        variant_sku: true,
        variant_price: true,
        option_values: true,
        stock_at_time_of_purchase: true,
        shop_name: true,
        shop_description: true,
        logo_image_url: true,
        created_at: true,
        snapshot_hash: true,
        orderItem: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        product: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        variant: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
        seller: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_sellersFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot> {
    return {
      id: input.id,
      product_name: input.product_name,
      product_description: input.product_description,
      category_id: input.category_id,
      category_name: input.category_name,
      base_price: input.base_price,
      thumbnail_image_url: input.thumbnail_image_url,
      all_product_images: input.all_product_images,
      variant_sku: input.variant_sku,
      variant_price: input.variant_price ?? null,
      option_values: input.option_values,
      stock_at_time_of_purchase: input.stock_at_time_of_purchase,
      shop_name: input.shop_name,
      shop_description: input.shop_description ?? null,
      logo_image_url: input.logo_image_url ?? null,
      created_at: input.created_at.toISOString(),
      snapshot_hash: input.snapshot_hash,
      order_item_id: input.orderItem.id,
      product_id: input.product.id,
      variant_id: input.variant.id,
      seller_id: input.seller.id,
    };
  }
}
