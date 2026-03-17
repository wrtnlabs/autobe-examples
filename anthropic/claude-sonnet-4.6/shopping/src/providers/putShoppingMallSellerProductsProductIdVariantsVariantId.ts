import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductVariantTransformer } from "../transformers/ShoppingMallProductVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdVariantsVariantId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.IUpdate;
}): Promise<IShoppingMallProductVariant> {
  // Step 1: Verify product exists and is not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: { id: props.productId, deleted_at: null },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
      },
    },
  );
  // Step 2: Verify seller ownership
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify variant exists and belongs to this product (not deleted)
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 4: Check SKU uniqueness platform-wide (excluding current variant)
  const skuConflict =
    await MyGlobal.prisma.shopping_mall_product_variants.findFirst({
      where: {
        sku: props.body.sku,
        id: { not: props.variantId },
      },
      select: { id: true },
    });
  if (skuConflict !== null) {
    throw new HttpException(
      "Conflict: SKU code already in use by another variant",
      409,
    );
  }
  // Step 5: Transaction — update variant, replace options, create snapshot
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 5a. Update the variant
    await tx.shopping_mall_product_variants.update({
      where: { id: props.variantId },
      data: {
        sku: props.body.sku,
        price_override: props.body.priceOverride ?? null,
        updated_at: new Date(),
      },
    });
    // 5b. Delete all existing options for this variant
    await tx.shopping_mall_product_variant_options.deleteMany({
      where: { product_variant_id: props.variantId },
    });
    // 5c. Insert new options with sequence from array position
    await tx.shopping_mall_product_variant_options.createMany({
      data: props.body.options.map((opt, index) => ({
        id: v4(),
        product_variant_id: props.variantId,
        key: opt.key,
        value: opt.value,
        sequence: index,
        created_at: new Date(),
      })),
    });
    // 5d. Fetch all active variants (including updated one) for the snapshot
    const activeVariants = await tx.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku: true,
        price_override: true,
        options: {
          select: {
            key: true,
            value: true,
            sequence: true,
          },
          orderBy: { sequence: "asc" },
        },
      },
    });
    // 5e. Create the product snapshot with all active variants
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: v4(),
        product_id: props.productId,
        category_id: product.shopping_mall_category_id ?? null,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        category_name: null,
        created_at: new Date(),
        snapshotSkuses: {
          create: activeVariants.map((variant) => ({
            id: v4(),
            product_variant_id: variant.id,
            sku_code: variant.sku,
            price: variant.price_override ?? product.base_price,
            created_at: new Date(),
            options: {
              create: variant.options.map((opt) => ({
                id: v4(),
                key: opt.key,
                value: opt.value,
                sequence: opt.sequence,
              })),
            },
          })),
        },
      },
    });
  });
  // Step 6: Return updated variant using Transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      ...ShoppingMallProductVariantTransformer.select(),
    });
  return ShoppingMallProductVariantTransformer.transform(updated);
}
