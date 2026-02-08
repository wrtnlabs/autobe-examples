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
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Unauthorized", 403);
  }
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
  });
  if (!image) {
    throw new HttpException("Image not found", 404);
  }
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image does not belong to the product", 400);
  }
  await MyGlobal.prisma.shopping_mall_product_images.delete({
    where: { id: props.imageId },
  });
}
