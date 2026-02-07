import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
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

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  const variant =
    await MyGlobal.prisma.shopping_mall_product_variants.findUnique({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
    });
  if (!variant || variant.seller_id !== props.seller.id) {
    throw new HttpException("Variant not found or not owned by seller", 404);
  }
  // The IUpdate interface doesn't contain stock or price_override — these are not updatable by the client
  // So we always use the current variant values, never from body
  const newStock = variant.stock;
  const priceOverride = variant.price_override;
  const updatedVariant =
    await MyGlobal.prisma.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        price_override: priceOverride,
        stock: newStock,
        updated_at: toISOStringSafe(new Date()) as string &
          tags.Format<"date-time">,
      },
    });
  await MyGlobal.prisma.shopping_mall_inventory_histories.create({
    data: {
      id: v4(), // Added required id field
      shopping_mall_product_variant_id: props.variantId,
      quantity_change: newStock - variant.stock,
      reason: "variant update",
      reference_id: null,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  return {
    id: updatedVariant.id,
    product_id: updatedVariant.product_id,
    seller_id: updatedVariant.seller_id,
    sku: updatedVariant.sku,
    option_values: updatedVariant.option_values,
    price_override: updatedVariant.price_override,
    stock: updatedVariant.stock,
    created_at: toISOStringSafe(updatedVariant.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(updatedVariant.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at: updatedVariant.deleted_at,
  };
}
