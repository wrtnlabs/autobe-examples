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
  // 1. Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      deleted_at: true,
      name: true,
      description: true,
      base_price: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.deleted_at !== null) {
    throw new HttpException("Product has been deleted", 404);
  }
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("You do not own this product", 403);
  }
  // 2. Check blocking conditions - no pending order items
  const pendingOrderItems =
    await MyGlobal.prisma.shopping_mall_order_items.count({
      where: {
        shopping_mall_product_id: props.productId,
        status: { in: ["paid", "shipped"] },
      },
    });
  if (pendingOrderItems > 0) {
    throw new HttpException(
      "Cannot delete image: product has pending orders",
      400,
    );
  }
  // 3. Check for pending cancellation requests
  const pendingCancellations =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.count({
      where: {
        orderItem: {
          shopping_mall_product_id: props.productId,
        },
        status: "pending",
      },
    });
  if (pendingCancellations > 0) {
    throw new HttpException(
      "Cannot delete image: product has pending cancellation requests",
      400,
    );
  }
  // 4. Check for pending refund requests
  const pendingRefunds =
    await MyGlobal.prisma.shopping_mall_refund_requests.count({
      where: {
        orderItem: {
          shopping_mall_product_id: props.productId,
        },
        status: "pending",
      },
    });
  if (pendingRefunds > 0) {
    throw new HttpException(
      "Cannot delete image: product has pending refund requests",
      400,
    );
  }
  // 5. Verify image exists and belongs to product
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      display_order: true,
    },
  });
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product", 400);
  }
  // 6. Perform deletion in transaction with display order adjustment and snapshot creation
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the image
    await tx.shopping_mall_product_images.delete({
      where: { id: props.imageId },
    });
    // Adjust display order for remaining images
    await tx.shopping_mall_product_images.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        display_order: { gt: image.display_order },
      },
      data: {
        display_order: {
          decrement: 1,
        },
      },
    });
    // Get updated images for snapshot
    const updatedImages = await tx.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      select: { image_url: true, display_order: true },
      orderBy: { display_order: "asc" },
    });
    // Get variants for snapshot
    const variants = await tx.shopping_mall_product_variants.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        sku_code: true,
        option_values: true,
        price: true,
        inventoryRecords: {
          select: { quantity_change: true },
        },
      },
    });
    // Create product snapshot
    const snapshotId = v4();
    await tx.shopping_mall_product_snapshots.create({
      data: {
        id: snapshotId,
        shopping_mall_product_id: props.productId,
        name: product.name,
        description: product.description,
        base_price: product.base_price,
        images: JSON.stringify(updatedImages.map((img) => img.image_url)),
        created_at: now,
      },
    });
    // Create variant snapshots
    for (const variant of variants) {
      const stockQuantity = variant.inventoryRecords.reduce(
        (sum, record) => sum + record.quantity_change,
        0,
      );
      await tx.shopping_mall_product_snapshot_skuses.create({
        data: {
          id: v4(),
          shopping_mall_product_snapshot_id: snapshotId,
          sku_code: variant.sku_code,
          option_values: variant.option_values,
          price: variant.price,
          stock_quantity: stockQuantity,
          created_at: now,
        },
      });
    }
  });
}
