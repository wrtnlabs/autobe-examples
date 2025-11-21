import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminProductsProductIdImagesImageId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });

  if (!image) {
    throw new HttpException("Product image not found or already deleted", 404);
  }

  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
