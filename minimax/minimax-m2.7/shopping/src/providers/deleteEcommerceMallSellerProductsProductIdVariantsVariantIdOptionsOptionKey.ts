import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteEcommerceMallSellerProductsProductIdVariantsVariantIdOptionsOptionKey(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  optionKey: string;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Verify product exists and belongs to seller
    const product = await tx.ecommerce_mall_products.findFirst({
      where: {
        id: props.productId,
        ecommerce_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!product) {
      throw new HttpException("Product not found or access denied", 403);
    }
    // 2. Verify variant exists and belongs to product
    const variant = await tx.ecommerce_mall_product_variants.findFirst({
      where: {
        id: props.variantId,
        ecommerce_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!variant) {
      throw new HttpException("Variant not found or access denied", 403);
    }
    // 3. Verify option with key exists for this variant
    const optionValue =
      await tx.ecommerce_mall_product_variant_option_values.findFirst({
        where: {
          ecommerce_mall_product_variant_id: props.variantId,
          key: props.optionKey,
        },
        select: { id: true },
      });
    if (!optionValue) {
      throw new HttpException("Option not found", 404);
    }
    // 4. Delete the option value record
    await tx.ecommerce_mall_product_variant_option_values.delete({
      where: { id: optionValue.id },
    });
  });
}
