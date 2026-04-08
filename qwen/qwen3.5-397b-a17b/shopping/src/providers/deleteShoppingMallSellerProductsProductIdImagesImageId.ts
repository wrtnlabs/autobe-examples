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
  // 1. Validate seller owns the product
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    });
  // 2. Verify image exists, belongs to product, and is not already deleted
  const image =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  // 3. Count active images - must have at least 2 to allow deletion
  const activeImageCount =
    await MyGlobal.prisma.shopping_mall_product_images.count({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
    });
  if (activeImageCount <= 1) {
    throw new HttpException(
      "At least one image must remain on the product",
      400,
    );
  }
  // 4. If deleted image is the thumbnail (display_order 0), reorder remaining images
  if (image.display_order === 0) {
    await MyGlobal.prisma.shopping_mall_product_images.updateMany({
      where: {
        shopping_mall_product_id: props.productId,
        display_order: { gt: image.display_order },
        deleted_at: null,
      },
      data: {
        display_order: { decrement: 1 },
        updated_at: new Date(),
      },
    });
  }
  // 5. Soft-delete the image
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: {
      id: props.imageId,
    },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
