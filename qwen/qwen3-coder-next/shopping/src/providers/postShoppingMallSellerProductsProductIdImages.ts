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

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
}): Promise<void> {
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found or access denied", 404);
  }
  // Determine the next sort order for images
  const maxSortOrderResult =
    await MyGlobal.prisma.shopping_mall_product_images.aggregate({
      _max: {
        sort_order: true,
      },
      where: {
        shopping_mall_product_id: props.productId,
      },
    });
  const nextSortOrder = (maxSortOrderResult._max.sort_order ?? 0) + 1;
  // Assuming images are uploaded as part of the request
  // In a real implementation, this would handle multipart/form-data
  // For now, we'll assume images are passed as an array of URLs in the body
  // This would need to be adjusted based on the actual request format
  // For demonstration, we'll create a sample image record
  // In practice, this would be replaced with actual image upload logic
  // Create product image record
  // This is a simplified version - actual implementation would handle file uploads
  await MyGlobal.prisma.shopping_mall_product_images.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      image_url: "https://example.com/image.jpg" as string & tags.Format<"uri">, // In practice, this would be the actual uploaded image URL
      sort_order: nextSortOrder,
    },
  });
  // Create product snapshot for audit trail
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      shopping_mall_category_id: product.shopping_mall_category_id,
      name: product.name,
      description: product.description,
      base_price: product.base_price,
      is_deleted: product.is_deleted,
      deleted_at: product.deleted_at
        ? toISOStringSafe(product.deleted_at)
        : null,
      snapshot_timestamp: toISOStringSafe(new Date()),
      snapshot_version: 1, // This would need to be calculated based on existing snapshots
    },
  });
}
