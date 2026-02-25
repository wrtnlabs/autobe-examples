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
  productId: string;
  imageId: string;
}): Promise<void> {
  // 1. Verify product ownership
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify image exists and belongs to this product
  await MyGlobal.prisma.shopping_mall_product_images.findFirstOrThrow({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
    },
  });
  // 3. Get remaining images (before deletion, excluding the one being deleted)
  const remainingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        id: { not: props.imageId },
      },
      select: {
        id: true,
      },
    });
  // 4. Delete the image
  await MyGlobal.prisma.shopping_mall_product_images.delete({
    where: { id: props.imageId },
  });
  // 5. Create product snapshot (per snapshot principle)
  const snapshotId = v4();
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      product: { connect: { id: product.id } },
      seller: { connect: { id: product.seller_id } },
      ...(product.category_id !== null
        ? { category: { connect: { id: product.category_id } } }
        : {}),
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      created_at: new Date(),
    },
  });
  // 6. Link remaining images to snapshot
  if (remainingImages.length > 0) {
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.createMany({
      data: remainingImages.map((img) => ({
        id: v4(),
        shopping_mall_product_snapshot_id: snapshotId,
        shopping_mall_product_image_id: img.id,
        created_at: new Date(),
      })),
    });
  }
}
