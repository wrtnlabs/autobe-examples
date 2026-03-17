import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IReorder;
}): Promise<IShoppingMallProductImage.IReorderResult> {
  // 1. Find product (404 if not found or soft-deleted)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: { id: props.productId, deleted_at: null },
      select: {
        id: true,
        shopping_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
        category: { select: { id: true, name: true } },
        variants: {
          where: { deleted_at: null },
          select: {
            id: true,
            sku: true,
            price_override: true,
            options: {
              select: { key: true, value: true, sequence: true },
              orderBy: { sequence: "asc" },
            },
          },
        },
      },
    },
  );
  // 2. Fetch all current images for the product (id + url)
  const currentImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: { id: true, url: true },
    });
  // 3. Validate provided imageIds exactly match current image set
  const currentImageIdSet = new Set(currentImages.map((img) => img.id));
  const providedIds = props.body.imageIds;
  if (
    currentImageIdSet.size !== providedIds.length ||
    providedIds.some((id) => !currentImageIdSet.has(id))
  ) {
    throw new HttpException(
      "The provided image IDs do not exactly match the current images for this product",
      422,
    );
  }
  // 4. Build URL lookup map
  const imageUrlMap = new Map(currentImages.map((img) => [img.id, img.url]));
  const now = new Date();
  // 5. Execute transaction: update sequences, update product timestamp, create snapshot
  await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Update sequence for each image
    for (let i = 0; i < providedIds.length; i++) {
      await tx.shopping_mall_product_images.update({
        where: { id: providedIds[i] },
        data: { sequence: i },
      });
    }
    // b. Update product updated_at
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: { updated_at: now },
    });
    // c. Create product snapshot
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: v4(),
        product_id: product.id,
        category_id: product.shopping_mall_category_id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        category_name: product.category?.name ?? null,
        created_at: now,
        snapshotImages: {
          create: providedIds.map((imageId, i) => ({
            id: v4(),
            url: imageUrlMap.get(imageId) ?? "",
            sequence: i,
            created_at: now,
          })),
        },
        snapshotSkuses: {
          create: product.variants.map((variant) => ({
            id: v4(),
            product_variant_id: variant.id,
            sku_code: variant.sku,
            price: variant.price_override ?? product.base_price,
            created_at: now,
            options: {
              create: variant.options.map((opt) => ({
                id: v4(),
                sequence: opt.sequence,
                key: opt.key,
                value: opt.value,
              })),
            },
          })),
        },
      },
    });
  });
  // 6. Query updated images ordered by sequence ASC
  const updatedImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { sequence: "asc" },
      ...ShoppingMallProductImageTransformer.select(),
    });
  // 7. Transform and return
  return {
    images: await ArrayUtil.asyncMap(
      updatedImages,
      ShoppingMallProductImageTransformer.transform,
    ),
  };
}
