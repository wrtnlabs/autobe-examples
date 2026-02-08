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

export async function deleteShoppingMallSellerSaleImagesImageId(props: {
  seller: SellerPayload;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find corresponding sale image with seller info
  const image = await MyGlobal.prisma.shopping_mall_sale_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      sale: {
        select: {
          seller_id: true,
        },
      },
    },
  });
  if (!image) {
    throw new HttpException("Sale Image not found", 404);
  }
  if (image.sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Run transaction to delete the image
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_sale_images.delete({
      where: { id: props.imageId },
    });
  });
  // Return void for 204 No Content
}
