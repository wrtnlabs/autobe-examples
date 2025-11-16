import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdSkusSkuIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string;
  skuId: string;
  imageId: string;
}): Promise<void> {
  // Step 1: Fetch image record (must exist, not deleted, linked to sku + product)
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      sku: { id: props.skuId },
      product: { id: props.productId },
      deleted_at: null,
    },
  });
  if (!image) {
    throw new HttpException(
      "Image not found, already deleted, or not associated with this product/SKU.",
      404,
    );
  }

  // Step 2: Verify the product ownership (by this seller)
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      seller: { id: props.seller.id },
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Forbidden: you do not own this product.", 403);
  }

  // Step 3: Soft-delete the image (set deleted_at)
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });

  // Step 4: Return void (nothing)
}
