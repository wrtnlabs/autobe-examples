import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  // Verify product exists, is not deleted, and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId, deleted_at: null },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify image exists and belongs to the product
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        url: true,
        sort_order: true,
        is_primary: true,
        ecommerce_mall_product_id: true,
      },
    });
  if (image.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  // Store previous values for snapshot
  const previousValues = {
    url: image.url,
    sort_order: image.sort_order,
    is_primary: image.is_primary,
  };
  // Determine new values
  const newUrl = props.body.url !== undefined ? props.body.url : image.url;
  const newSortOrder =
    props.body.sortOrder !== undefined
      ? props.body.sortOrder
      : image.sort_order;
  const newIsPrimary = newSortOrder === 0;
  // Build update data
  const updateData: Prisma.ecommerce_mall_product_imagesUpdateInput = {
    url: newUrl,
    sort_order: newSortOrder,
    is_primary: newIsPrimary,
    updated_at: now,
  };
  // If sort_order changed, recalculate is_primary for all other images
  if (
    props.body.sortOrder !== undefined &&
    image.sort_order !== props.body.sortOrder
  ) {
    // Update all other images to have is_primary = false
    await MyGlobal.prisma.ecommerce_mall_product_images.updateMany({
      where: {
        ecommerce_mall_product_id: props.productId,
        id: { not: props.imageId },
      },
      data: { is_primary: false },
    });
  }
  // Update the image
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: updateData,
  });
  // Create product snapshot
  const currentValues = {
    url: newUrl,
    sort_order: newSortOrder,
    is_primary: newIsPrimary,
  };
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_products_id: props.productId,
      ecommerce_mall_sellers_id: props.seller.id,
      previous_values: JSON.stringify(previousValues),
      current_values: JSON.stringify(currentValues),
      created_at: now,
    },
  });
  // Fetch updated image with product relation
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...EcommerceMallProductImageTransformer.select(),
    });
  return await EcommerceMallProductImageTransformer.transform(updated);
}
