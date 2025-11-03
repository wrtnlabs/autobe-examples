import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingSellerProductsProductCodeImagesImageId(props: {
  seller: SellerPayload;
  productCode: string;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find product by code
  const product = await MyGlobal.prisma.shopping_products.findFirst({
    where: {
      code: props.productCode,
      deleted_at: null,
    },
    select: { id: true, shopping_seller_id: true },
  });
  if (!product) throw new HttpException("Product not found", 404);

  if (product.shopping_seller_id !== props.seller.id)
    throw new HttpException("Forbidden: You do not own this product", 403);

  // 2. Find the image by id and product id
  const image = await MyGlobal.prisma.shopping_product_images.findFirst({
    where: {
      id: props.imageId,
      shopping_product_id: product.id,
    },
    select: { id: true },
  });
  if (!image) throw new HttpException("Image not found for this product", 404);

  // 3. Delete the image (hard delete)
  await MyGlobal.prisma.shopping_product_images.delete({
    where: { id: props.imageId },
  });
}
