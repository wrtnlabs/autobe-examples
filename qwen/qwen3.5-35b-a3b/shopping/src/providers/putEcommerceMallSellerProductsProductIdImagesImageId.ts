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
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: {
        id: props.imageId,
      },
    });
  if (image.product_id !== props.productId || image.deleted_at !== null) {
    throw new HttpException("Image not found", 404);
  }
  const updateData: Prisma.ecommerce_mall_product_imagesUpdateInput = {};
  if (props.body.display_order !== undefined) {
    if (props.body.display_order < 0) {
      throw new HttpException("Display order must be non-negative", 400);
    }
    updateData.display_order = props.body.display_order;
  }
  if (props.body.image_url !== undefined) {
    updateData.image_url = props.body.image_url;
  }
  if (Object.keys(updateData).length === 0) {
    throw new HttpException("At least one field must be provided", 400);
  }
  updateData.updated_at = new Date();
  const updatedImage = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.ecommerce_mall_product_images.update({
      where: { id: props.imageId },
      data: updateData,
      include: {
        product: { select: { id: true } },
      },
    });
    const productData = await tx.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        name: true,
        description: true,
        base_price: true,
        is_active: true,
        category_id: true,
        seller_id: true,
      },
    });
    await tx.ecommerce_mall_product_snapshots.create({
      data: {
        id: v4(),
        product_id: props.productId,
        category_id: productData.category_id,
        seller_id: productData.seller_id,
        name: productData.name,
        description: productData.description,
        base_price: productData.base_price,
        is_active: productData.is_active,
        created_at: new Date(),
      },
    });
    return updated;
  });
  return await EcommerceMallProductImageTransformer.transform(updatedImage);
}
