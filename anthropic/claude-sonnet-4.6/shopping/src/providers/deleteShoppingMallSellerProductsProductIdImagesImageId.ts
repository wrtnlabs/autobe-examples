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

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Load product (must exist and not be deleted)
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
  // 2. Verify ownership
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify image exists and belongs to the product
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: { id: props.imageId, shopping_mall_product_id: props.productId },
    select: { id: true },
  });
  if (image === null) {
    throw new HttpException("Not Found", 404);
  }
  // 4. Execute in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 4a. Delete the image
    await tx.shopping_mall_product_images.delete({
      where: { id: props.imageId },
    });
    // 4b. Reload remaining images ordered by sequence
    const remainingImages = await tx.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { sequence: "asc" },
      select: { id: true, url: true },
    });
    // 4c. Reassign contiguous sequence values starting from 0
    for (let i = 0; i < remainingImages.length; i++) {
      await tx.shopping_mall_product_images.update({
        where: { id: remainingImages[i].id },
        data: { sequence: i },
      });
    }
    // 4d. Update product updated_at
    await tx.shopping_mall_products.update({
      where: { id: props.productId },
      data: { updated_at: new Date() },
    });
    // 4e. Load active variants for snapshot SKU entries
    const variants = await tx.shopping_mall_product_variants.findMany({
      where: { shopping_mall_product_id: props.productId, deleted_at: null },
      select: { id: true, sku: true, price_override: true },
    });
    // 4f. Resolve category name if category is assigned
    let categoryName: string | null = null;
    if (product.shopping_mall_category_id !== null) {
      const category = await tx.shopping_mall_categories.findUnique({
        where: { id: product.shopping_mall_category_id },
        select: { name: true },
      });
      categoryName = category?.name ?? null;
    }
    // 4g. Create new product snapshot capturing current product state
    const snapshotId = v4();
    const now = new Date();
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        product_id: props.productId,
        category_id: product.shopping_mall_category_id,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        category_name: categoryName,
        created_at: now,
        snapshotImages: {
          create: remainingImages.map((img, idx) => ({
            id: v4(),
            url: img.url,
            sequence: idx,
            created_at: now,
          })),
        },
        snapshotSkuses: {
          create: variants.map((variant) => ({
            id: v4(),
            product_variant_id: variant.id,
            sku_code: variant.sku,
            price: variant.price_override ?? product.base_price,
            created_at: now,
          })),
        },
      },
    });
  });
}
