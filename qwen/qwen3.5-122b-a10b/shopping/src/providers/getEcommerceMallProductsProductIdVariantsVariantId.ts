import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductVariantTransformer } from "../transformers/EcommerceMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdVariantsVariantId(props: {
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariant> {
  // First verify the product exists and is not deleted
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, deleted_at: true, status: true },
  });
  if (!product || product.deleted_at !== null || product.status === "deleted") {
    throw new HttpException("Product not found", 404);
  }
  // Fetch the variant with all necessary relations
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.variantId },
      select: {
        id: true,
        sku_code: true,
        price: true,
        stock_quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        ecommerce_mall_product_id: true,
        product: EcommerceMallProductVariantTransformer.select().select.product,
        variantOptions: {
          select: {
            key: true,
            value: true,
          },
        } satisfies Prisma.ecommerce_mall_product_variant_optionsFindManyArgs,
        inventoryRecords: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
        orderItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
        cartItems: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_cart_itemsFindManyArgs,
      },
    });
  // Verify variant exists and belongs to the specified product
  if (!variant || variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Variant not found", 404);
  }
  // Transform and return using the transformer
  return await EcommerceMallProductVariantTransformer.transform(variant);
}
