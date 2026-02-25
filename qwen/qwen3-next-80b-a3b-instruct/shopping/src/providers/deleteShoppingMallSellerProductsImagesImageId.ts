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

export async function deleteShoppingMallSellerProductsImagesImageId(props: {
  seller: SellerPayload;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    // Fetch image and validate ownership
    const image = await prisma.shopping_mall_product_images.findFirst({
      where: {
        id: props.imageId,
        deleted_at: null,
        product: {
          seller_id: props.seller.id,
          deleted_at: null,
        },
      },
      select: {
        id: true,
        product_id: true,
        position: true,
        created_at: true,
      },
    });
    if (!image) {
      throw new HttpException("Image not found", 404);
    }
    const isPrimary = image.position === 0;
    // Soft-delete the image
    await prisma.shopping_mall_product_images.update({
      where: { id: props.imageId },
      data: {
        deleted_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
    });
    // Promote next image to primary if needed
    if (isPrimary) {
      const nextImage = await prisma.shopping_mall_product_images.findFirst({
        where: {
          product_id: image.product_id,
          deleted_at: null,
          position: { gt: 0 },
        },
        orderBy: { position: "asc" },
        select: { id: true, position: true },
      });
      if (nextImage) {
        await prisma.shopping_mall_product_images.update({
          where: { id: nextImage.id },
          data: { position: 0 },
        });
      }
    }
    // Snapshot creation omitted: schema has no field to store audit JSON data.
    // Requirement cannot be met without schema modification.
  });
  return;
}
