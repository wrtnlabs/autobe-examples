import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

export async function putShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductImage.IReorder;
}): Promise<void> {
  // 1. Verify seller owns the product
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId as string & tags.Format<"uuid"> },
      select: {
        shopping_mall_seller_id: true,
        name: true,
        description: true,
        base_price: true,
        shopping_mall_category_id: true,
        deleted_at: true,
        is_deleted: true,
      },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate image_order array is not empty
  if (props.body.image_order.length === 0) {
    throw new HttpException("Image order array cannot be empty", 400);
  }
  // 3. Validate unique image IDs
  const uniqueImageIds = new Set(props.body.image_order);
  if (uniqueImageIds.size !== props.body.image_order.length) {
    throw new HttpException("Duplicate image IDs in order array", 400);
  }
  // 4. Get all product images to validate all IDs exist
  const productImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId as string &
          tags.Format<"uuid">,
      },
      select: { id: true, sort_order: true },
    });
  // 5. Validate all reorder IDs exist in product images
  const existingImageIds = new Set(productImages.map((img) => img.id));
  for (const imageId of props.body.image_order) {
    if (!existingImageIds.has(imageId)) {
      throw new HttpException(`Image ID not found in product: ${imageId}`, 404);
    }
  }
  // 6. Update sort_order for each image in the new order
  for (let i = 0; i < props.body.image_order.length; i++) {
    await MyGlobal.prisma.shopping_mall_product_images.update({
      where: { id: props.body.image_order[i] as string & tags.Format<"uuid"> },
      data: { sort_order: i + 1 },
    });
  }
  // 7. Create product snapshot after reordering
  const snapshotId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: snapshotId,
      shopping_mall_product_id: props.productId as string & tags.Format<"uuid">,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      shopping_mall_category_id: product.shopping_mall_category_id,
      deleted_at: toISOStringSafe(product.deleted_at ?? new Date()),
      shopping_mall_seller_id: product.shopping_mall_seller_id,
      is_deleted: product.is_deleted ?? false,
      snapshot_timestamp: toISOStringSafe(new Date()),
      snapshot_version: 1,
    },
  });
}
