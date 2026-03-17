import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageCollector } from "../collectors/ShoppingMallProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage.IBundle> {
  // 1. Fetch the product with category info
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
        shopping_mall_category_id: true,
        name: true,
        description: true,
        base_price: true,
        category: {
          select: { id: true, name: true },
        },
      },
    });
  // 2. Check if deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // 3. Ownership check
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Use collector to prepare image CreateInputs (handles max sequence logic)
  const imageCreateInputs = await ShoppingMallProductImageCollector.collect({
    body: props.body,
    shoppingMallProducts: { id: props.productId },
    shoppingMallSellers: { id: props.seller.id },
    shoppingMallSellerSessions: { id: props.seller.session_id },
  });
  // 5. Run all writes in a transaction
  const allImages = await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Insert all new images
    for (const imageInput of imageCreateInputs) {
      await tx.shopping_mall_product_images.create({ data: imageInput });
    }
    // b. Fetch all current images for this product ordered by sequence ASC
    const currentImages = await tx.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { sequence: "asc" },
      select: {
        id: true,
        shopping_mall_product_id: true,
        url: true,
        sequence: true,
        created_at: true,
      },
    });
    // c. Fetch all active variants with options for snapshot
    const activeVariants = await tx.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        sku: true,
        price_override: true,
      },
    });
    const snapshotNow = new Date();
    const snapshotId = v4();
    // d. Create product snapshot with nested snapshot images and SKUs
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        product_id: product.id,
        category_id: product.shopping_mall_category_id ?? null,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        category_name: product.category?.name ?? null,
        created_at: snapshotNow,
        snapshotImages: {
          create: currentImages.map((img) => ({
            id: v4(),
            url: img.url,
            sequence: img.sequence,
            created_at: snapshotNow,
          })),
        },
        snapshotSkuses: {
          create: activeVariants.map((variant) => ({
            id: v4(),
            product_variant_id: variant.id,
            sku_code: variant.sku,
            price: variant.price_override ?? product.base_price,
            created_at: snapshotNow,
          })),
        },
      },
    });
    // e. Update product's updated_at
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: { updated_at: snapshotNow },
    });
    return currentImages;
  });
  // 6. Transform all images and return as IBundle
  const images = await ArrayUtil.asyncMap(
    allImages,
    ShoppingMallProductImageTransformer.transform,
  );
  return { images } satisfies IShoppingMallProductImage.IBundle;
}
