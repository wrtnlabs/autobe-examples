import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdSkusSkuIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string;
  skuId: string;
  imageId: string;
}): Promise<void> {
  // Look up the image ensuring all associations (including soft-delete check)
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: {
      id: props.imageId,
      deleted_at: null,
      shopping_mall_product_id: props.productId,
      shopping_mall_product_sku_id: props.skuId,
    },
  });
  if (!image) {
    throw new HttpException(
      "Image not found, already deleted, or not associated with this product and SKU.",
      404,
    );
  }
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
