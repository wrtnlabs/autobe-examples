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
  // Verify seller owns the product
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  // Verify image exists, belongs to product, and is not soft-deleted
  await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
    where: {
      id: props.imageId,
      product_id: props.productId,
      deleted_at: null,
    },
  });
  // Build update data with only provided fields
  const updateData: Prisma.ecommerce_mall_product_imagesUpdateInput = {};
  if (props.body.image_url !== undefined) {
    updateData.image_url = props.body.image_url;
  }
  if (props.body.display_order !== undefined) {
    updateData.display_order = props.body.display_order;
  }
  if (props.body.alt_text !== undefined) {
    updateData.alt_text = props.body.alt_text;
  }
  updateData.updated_at = new Date();
  // Update the image
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: updateData,
  });
  // Return updated image using transformer
  const updatedImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...EcommerceMallProductImageTransformer.select(),
    });
  return await EcommerceMallProductImageTransformer.transform(updatedImage);
}
