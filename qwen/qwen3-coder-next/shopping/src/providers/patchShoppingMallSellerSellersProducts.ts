import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellersProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<void> {
  const id: string = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Verify seller exists and is not deleted
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
    where: { id: props.seller.id },
  });
  // Verify category exists and is not deleted
  const category =
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_category_id },
    });
  // Create product record
  await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      is_deleted: false,
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
      category: { connect: { id: props.body.shopping_mall_category_id } },
    },
  });
  // Create product variants
  for (const variant of props.body.variants) {
    const variantId: string = v4();
    const variantNow: string & tags.Format<"date-time"> = toISOStringSafe(
      new Date(),
    );
    // Create variant record
    await MyGlobal.prisma.shopping_mall_product_variants.create({
      data: {
        id: variantId,
        sku_code: variant.sku_code,
        price_override: variant.price_override ?? null,
        shopping_mall_product_id: id,
        stock_quantity: variant.stock_quantity ?? 0,
      },
    });
    // Create option values
    for (const optionValue of variant.option_values) {
      await MyGlobal.prisma.shopping_mall_product_variant_option_values.create({
        data: {
          id: v4(),
          option_name: optionValue.option_name,
          option_value: optionValue.option_value,
          variant: {
            connect: { id: variantId },
          },
        },
      });
    }
    // Create inventory history for initial stock
    if (variant.stock_quantity !== undefined && variant.stock_quantity > 0) {
      await MyGlobal.prisma.shopping_mall_inventory_histories.create({
        data: {
          id: v4(),
          shopping_mall_product_variant_id: variantId,
          quantity_change: variant.stock_quantity,
          reason: "INITIAL_STOCK",
          created_at: toISOStringSafe(new Date()),
        },
      });
    }
  }
  // Create product images
  if (props.body.images) {
    for (const image of props.body.images) {
      await MyGlobal.prisma.shopping_mall_product_images.create({
        data: {
          id: v4(),
          image_url: image.image_url,
          sort_order: image.sort_order,
          shopping_mall_product_id: id,
          shopping_mall_seller_id: props.seller.id,
        },
      });
    }
  }
  // Create product snapshot for audit trail
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      shopping_mall_product_id: id,
      shopping_mall_seller_id: props.seller.id,
      shopping_mall_category_id: props.body.shopping_mall_category_id,
      is_deleted: false,
      snapshot_timestamp: toISOStringSafe(new Date()),
      snapshot_version: 1,
    },
  });
}
