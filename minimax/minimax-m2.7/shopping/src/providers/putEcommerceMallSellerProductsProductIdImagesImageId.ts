import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // 1. Verify product exists (productId validation)
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  // 2. Verify image exists and belongs to the specified product
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: { id: true, product_id: true, display_order: true },
    });
  if (image.product_id !== props.productId) {
    throw new HttpException("Product image not found", 404);
  }
  // 3. Verify product belongs to the authenticated seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. If updating display_order, check for conflicts with existing images
  if (props.body.display_order !== undefined) {
    const conflictExists =
      await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
        where: {
          product_id: props.productId,
          display_order: props.body.display_order,
          id: { not: props.imageId },
        },
        select: { id: true },
      });
    if (conflictExists) {
      throw new HttpException(
        "Display order conflict: another image already has this order",
        409,
      );
    }
  }
  // 5. Update the image record with provided fields
  const updated = await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      ...(props.body.image_url !== undefined && {
        image_url: props.body.image_url,
      }),
      ...(props.body.display_order !== undefined && {
        display_order: props.body.display_order,
      }),
      updated_at: new Date(),
    },
    ...EcommerceMallProductImageTransformer.select(),
  });
  // 6. Return the updated image record
  return await EcommerceMallProductImageTransformer.transform(updated);
}
