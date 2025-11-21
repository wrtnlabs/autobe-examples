import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
    include: { product: true },
  });

  if (!image) {
    throw new HttpException("Image not found", 404);
  }

  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to this product", 400);
  }

  if (image.deleted_at !== null) {
    throw new HttpException("Image already deleted", 410);
  }

  if (
    image.product &&
    image.product.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden: You don't own this product", 403);
  }

  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
