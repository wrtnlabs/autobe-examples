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
  const { productId, imageId } = props;

  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: { id: productId },
  });

  const imageToDelete =
    await MyGlobal.prisma.shopping_mall_product_images.findUnique({
      where: { id: imageId },
    });

  if (!imageToDelete) {
    throw new HttpException("Image not found", 404);
  }

  if (imageToDelete.shopping_mall_product_id !== productId) {
    throw new HttpException(
      "Image does not belong to the specified product",
      400,
    );
  }

  const totalImages = await MyGlobal.prisma.shopping_mall_product_images.count({
    where: {
      shopping_mall_product_id: productId,
    },
  });

  if (totalImages === 1) {
    throw new HttpException(
      "Cannot delete the only image. Products must have at least one image to remain active.",
      400,
    );
  }

  if (imageToDelete.is_primary) {
    const nextPrimaryImage =
      await MyGlobal.prisma.shopping_mall_product_images.findFirst({
        where: {
          shopping_mall_product_id: productId,
          id: { not: imageId },
        },
        orderBy: { display_order: "asc" },
      });

    if (nextPrimaryImage) {
      await MyGlobal.prisma.shopping_mall_product_images.update({
        where: { id: nextPrimaryImage.id },
        data: { is_primary: true },
      });
    }
  }

  const deletedDisplayOrder = imageToDelete.display_order;

  await MyGlobal.prisma.shopping_mall_product_images.delete({
    where: { id: imageId },
  });

  await MyGlobal.prisma.shopping_mall_product_images.updateMany({
    where: {
      shopping_mall_product_id: productId,
      display_order: { gt: deletedDisplayOrder },
    },
    data: {
      display_order: { decrement: 1 },
    },
  });
}
