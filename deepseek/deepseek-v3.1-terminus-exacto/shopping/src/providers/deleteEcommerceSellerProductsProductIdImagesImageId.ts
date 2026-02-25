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
  // Use transaction for atomic operations
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Validate product exists and belongs to seller
    const product = await tx.ecommerce_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        ecommerce_seller_id: props.seller.id,
        deleted_at: null,
      },
    });
    // Validate image exists and belongs to specified product
    const image = await tx.ecommerce_product_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
        ecommerce_product_id: props.productId,
      },
    });
    // Delete the image
    await tx.ecommerce_product_images.delete({
      where: { id: props.imageId },
    });
    // Reorder remaining images by shifting positions down
    if (image.position > 1) {
      await tx.ecommerce_product_images.updateMany({
        where: {
          ecommerce_product_id: props.productId,
          position: { gt: image.position },
        },
        data: {
          position: { decrement: 1 },
        },
      });
    }
    // Update product timestamp with proper ISO string
    await tx.ecommerce_products.update({
      where: { id: props.productId },
      data: {
        updated_at: new Date(Date.now()).toISOString(),
      },
    });
  });
}
