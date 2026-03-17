import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductImageTransformer } from "../transformers/EcommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IUpdate;
}): Promise<IEcommerceMallProductImage> {
  // Validate seller ownership of the product
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the image and verify it belongs to this product
  const existingImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
      where: {
        id: props.imageId,
        product_id: props.productId,
        deleted_at: null,
      },
    });
  if (existingImage === null) {
    throw new HttpException("Image not found", 404);
  }
  // Handle display order update with unique constraint validation
  if (props.body.displayOrder !== undefined) {
    // Check if another image has this display_order
    const conflictingImage =
      await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
        where: {
          product_id: props.productId,
          display_order: props.body.displayOrder,
          id: { not: props.imageId },
          deleted_at: null,
        },
      });
    if (conflictingImage !== null) {
      // Swap orders: move conflicting image to current image's position
      await MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: conflictingImage.id },
        data: {
          display_order: existingImage.display_order,
          updated_at: new Date().toISOString(),
        },
      });
    }
  }
  // Update the target image
  const updateData: Prisma.ecommerce_mall_product_imagesUpdateInput = {
    updated_at: new Date().toISOString(),
  };
  if (props.body.imageUrl !== undefined) {
    updateData.image_url = props.body.imageUrl;
  }
  if (props.body.displayOrder !== undefined) {
    updateData.display_order = props.body.displayOrder;
  }
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: updateData,
  });
  // Retrieve updated image with transformer select
  const updatedImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...EcommerceMallProductImageTransformer.select(),
    });
  return await EcommerceMallProductImageTransformer.transform(updatedImage);
}
