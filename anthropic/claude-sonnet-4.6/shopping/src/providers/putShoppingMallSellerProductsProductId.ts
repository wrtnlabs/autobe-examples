import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProduct.IUpdate;
}): Promise<IShoppingMallProduct> {
  // Step 1: Look up the product, ensure it exists and is not deleted
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        shopping_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
        deleted_at: true,
      },
    });
  // Step 2: Ensure product is not deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Step 3: Enforce product ownership
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Validate categoryId if provided (not undefined and not null)
  if (props.body.categoryId !== undefined && props.body.categoryId !== null) {
    await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
      where: { id: props.body.categoryId },
      select: { id: true },
    });
  }
  // Determine new field values (merging with existing)
  const newName: string =
    props.body.name !== undefined ? props.body.name : product.name;
  const newDescription: string =
    props.body.description !== undefined
      ? props.body.description
      : product.description;
  const newBasePrice: number =
    props.body.base_price !== undefined
      ? props.body.base_price
      : product.base_price;
  const newCategoryId: string | null =
    props.body.categoryId !== undefined
      ? (props.body.categoryId ?? null)
      : product.shopping_mall_category_id;
  // Step 5: Fetch category name for snapshot (if category assigned)
  const categoryName: string | null =
    newCategoryId !== null
      ? await MyGlobal.prisma.shopping_mall_categories
          .findUnique({
            where: { id: newCategoryId },
            select: { name: true },
          })
          .then((c) => c?.name ?? null)
      : null;
  // Step 6: Fetch active variants for snapshot
  const activeVariants =
    await MyGlobal.prisma.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku: true,
        price_override: true,
      },
      orderBy: { created_at: "asc" },
    });
  // Step 7: Fetch variant options for snapshot
  const variantIds = activeVariants.map((v) => v.id);
  const variantOptions =
    await MyGlobal.prisma.shopping_mall_product_variant_options.findMany({
      where: { product_variant_id: { in: variantIds } },
      select: {
        id: true,
        product_variant_id: true,
        key: true,
        value: true,
        sequence: true,
      },
      orderBy: { sequence: "asc" },
    });
  // Step 8: Fetch product images for snapshot
  const productImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: {
        url: true,
        sequence: true,
      },
      orderBy: { sequence: "asc" },
    });
  // Step 9: Execute update + snapshot creation in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 9a: Update product
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.base_price !== undefined && {
          base_price: props.body.base_price,
        }),
        ...(props.body.categoryId !== undefined && {
          shopping_mall_category_id: props.body.categoryId ?? null,
        }),
        updated_at: new Date(),
      },
    });
    // 9b: Create product snapshot
    const snapshotId: string = v4();
    const snapshotNow: Date = new Date();
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        product_id: props.productId,
        category_id: newCategoryId,
        name: newName,
        description: newDescription,
        base_price: newBasePrice,
        category_name: categoryName,
        created_at: snapshotNow,
      },
    });
    // 9c: Create snapshot SKUs for each active variant with their options
    for (const variant of activeVariants) {
      const skuId: string = v4();
      const variantPrice: number =
        variant.price_override !== null ? variant.price_override : newBasePrice;
      const optionsForVariant = variantOptions.filter(
        (o) => o.product_variant_id === variant.id,
      );
      await tx.shopping_mall_product_snapshot_skuses.create({
        data: {
          id: skuId,
          product_snapshot_id: snapshotId,
          product_variant_id: variant.id,
          sku_code: variant.sku,
          price: variantPrice,
          created_at: snapshotNow,
          options: {
            create: optionsForVariant.map((opt) => ({
              id: v4(),
              sequence: opt.sequence,
              key: opt.key,
              value: opt.value,
            })),
          },
        },
      });
    }
    // 9d: Create snapshot images
    for (const img of productImages) {
      await tx.shopping_mall_product_snapshot_images.create({
        data: {
          id: v4(),
          product_snapshot_id: snapshotId,
          url: img.url,
          sequence: img.sequence,
          created_at: snapshotNow,
        },
      });
    }
  });
  // Step 10: Fetch and return the updated product via transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...ShoppingMallProductTransformer.select(),
    });
  return ShoppingMallProductTransformer.transform(updated);
}
