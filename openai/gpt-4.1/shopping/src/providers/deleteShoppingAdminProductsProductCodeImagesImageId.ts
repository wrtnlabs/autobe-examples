import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminProductsProductCodeImagesImageId(props: {
  admin: AdminPayload;
  productCode: string;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find product by code
  const product = await MyGlobal.prisma.shopping_products.findUnique({
    where: { code: props.productCode },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }

  // 2. Find image and confirm it is linked to the correct product
  const image = await MyGlobal.prisma.shopping_product_images.findUnique({
    where: { id: props.imageId },
  });
  if (!image || image.shopping_product_id !== product.id) {
    throw new HttpException("Image not found for given product", 404);
  }

  // 3. Delete the image (hard delete)
  await MyGlobal.prisma.shopping_product_images.delete({
    where: { id: props.imageId },
  });
}
