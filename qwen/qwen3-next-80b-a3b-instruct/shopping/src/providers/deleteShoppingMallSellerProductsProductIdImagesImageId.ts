import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string;
  imageId: string;
}): Promise<void> {
  // Fetch image with related product and seller info
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
    },
    select: {
      shopping_mall_product_id: true, // select the shopping_mall_product_id field directly
    },
  });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  // Now fetch the product separately to verify ownership and deletion status
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: {
      id: image.shopping_mall_product_id,
    },
    select: {
      seller_id: true,
      deleted_at: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Verify product belongs to seller
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden - You do not own this product", 403);
  }
  // Verify product is not deleted
  if (product.deleted_at !== null) {
    throw new HttpException("Product has been deleted", 404);
  }
  // Verify seller is active and not suspended
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: {
      id: props.seller.id,
    },
    select: {
      deleted_at: true,
      is_suspended: true,
    },
  });
  if (!seller) {
    throw new HttpException("Seller account not found", 403);
  }
  if (seller.deleted_at !== null) {
    throw new HttpException("Seller account suspended", 403);
  }
  if (seller.is_suspended === true) {
    throw new HttpException("Seller account suspended", 403);
  }
  // Delete the image record
  await MyGlobal.prisma.shopping_mall_product_images.delete({
    where: {
      id: props.imageId,
    },
  });
  // System automatically creates product snapshot via event
  // No direct snapshot creation needed in this provider function
}
