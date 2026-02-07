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
  productId: string;
  imageId: string;
}): Promise<void> {
  // Validate that the image exists and belongs to the specified product
  const image = await MyGlobal.prisma.shopping_mall_product_images.findFirst({
    where: {
      id: props.imageId as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId as string & tags.Format<"uuid">,
      product: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  });
  if (!image) {
    throw new HttpException(
      "Image not found or does not belong to this product",
      404,
    );
  }
  // Check if this is the only image for the product
  const otherImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId as string &
          tags.Format<"uuid">,
        id: { not: image.id },
      },
    });
  if (otherImages.length === 0) {
    throw new HttpException("Product must have at least one image", 400);
  }
  // Get the display order of the image being deleted
  const deletedOrder = image.display_order;
  // Delete the image record
  await MyGlobal.prisma.shopping_mall_product_images.delete({
    where: { id: image.id },
  });
  // Reorder remaining images to fill the gap
  await MyGlobal.prisma.shopping_mall_product_images.updateMany({
    where: {
      shopping_mall_product_id: props.productId as string & tags.Format<"uuid">,
      display_order: { gt: deletedOrder },
    },
    data: {
      display_order: { decrement: 1 },
    },
  });
}
