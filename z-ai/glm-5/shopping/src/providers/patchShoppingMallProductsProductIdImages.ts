import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageAtSummaryTransformer } from "../transformers/ShoppingMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage.ISummary> {
  // 1. Verify product exists and is not deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      deleted_at: true,
      seller: {
        select: { suspended: true },
      },
    },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // Check seller is not suspended
  if (product.seller.suspended) {
    throw new HttpException("Seller account is suspended", 403);
  }
  // 2. Verify image exists and belongs to product
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.body.id },
    select: {
      id: true,
      shopping_mall_product_id: true,
    },
  });
  if (!image || image.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Image not found or does not belong to this product",
      404,
    );
  }
  // 3. Update display order with automatic conflict resolution
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the image's display_order
    await tx.shopping_mall_product_images.update({
      where: { id: props.body.id },
      data: { display_order: props.body.display_order },
    });
    // Query all images ordered by display_order ASC, created_at ASC
    const allImages = await tx.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      orderBy: [{ display_order: "asc" }, { created_at: "asc" }],
      select: { id: true, display_order: true },
    });
    // Check for conflicts and reassign sequential display_order if needed
    let needsReassignment = false;
    const seenOrders = new Set<number>();
    for (const img of allImages) {
      if (seenOrders.has(img.display_order)) {
        needsReassignment = true;
        break;
      }
      seenOrders.add(img.display_order);
    }
    if (needsReassignment) {
      for (let i = 0; i < allImages.length; i++) {
        await tx.shopping_mall_product_images.update({
          where: { id: allImages[i].id },
          data: { display_order: i },
        });
      }
    }
    // Return the updated image
    return tx.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.body.id },
      ...ShoppingMallProductImageAtSummaryTransformer.select(),
    });
  });
  return ShoppingMallProductImageAtSummaryTransformer.transform(result);
}
