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
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify image exists and belongs to this product
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: { id: true, shopping_mall_product_id: true, display_order: true },
    });
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product", 400);
  }
  // 3. Delete the image
  await MyGlobal.prisma.shopping_mall_product_images.delete({
    where: { id: props.imageId },
  });
  // 4. Reorder remaining images to maintain sequential display_order
  const remainingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { display_order: "asc" },
      select: { id: true, display_order: true },
    });
  // Update display_order sequentially
  for (let i = 0; i < remainingImages.length; i++) {
    if (remainingImages[i].display_order !== i + 1) {
      await MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id: remainingImages[i].id },
        data: { display_order: i + 1 },
      });
    }
  }
}
