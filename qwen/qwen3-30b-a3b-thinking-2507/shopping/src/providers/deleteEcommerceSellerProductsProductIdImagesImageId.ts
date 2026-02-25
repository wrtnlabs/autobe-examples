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

export async function deleteEcommerceSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const image = await MyGlobal.prisma.ecommerce_product_images.findFirst({
    where: {
      id: props.imageId,
      ecommerce_product_id: props.productId,
      deleted_at: null,
    },
  });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  await MyGlobal.prisma.ecommerce_product_images.update({
    where: { id: props.imageId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  return;
}
