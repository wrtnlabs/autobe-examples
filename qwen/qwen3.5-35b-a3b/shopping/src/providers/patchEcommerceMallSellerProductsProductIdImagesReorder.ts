import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductImageIReorderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImageIReorderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
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

export async function patchEcommerceMallSellerProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IReorder;
}): Promise<IPageIEcommerceMallProductImage.ISummary> {
  // 1. Validate seller owns the product
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Get all active images for the product to verify all are included
  const allImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      } satisfies Prisma.ecommerce_mall_product_imagesWhereInput,
      select: { id: true, display_order: true },
    });
  if (allImages.length === 0) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 100,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // 3. Validate all image IDs in body belong to the product and display_order values are unique
  const bodyImageIds = new Set(props.body.images.map((item) => item.image_id));
  const dbImageIds = new Set(allImages.map((img) => img.id));
  for (const imageId of dbImageIds) {
    if (!bodyImageIds.has(imageId)) {
      throw new HttpException(
        "Not all images are included in the reorder request",
        400,
      );
    }
  }
  const displayOrders = props.body.images.map((item) => item.display_order);
  const uniqueOrders = new Set(displayOrders);
  if (uniqueOrders.size !== displayOrders.length) {
    throw new HttpException("Display order values must be unique", 400);
  }
  const minOrder = Math.min(...displayOrders);
  if (minOrder !== 0) {
    throw new HttpException("Display order values must start from 0", 400);
  }
  // 4. Update each image's display_order in a batch
  const updatePromises = props.body.images.map((item) =>
    MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: item.image_id },
      data: {
        display_order: item.display_order,
        updated_at: new Date(),
      },
    }),
  );
  await Promise.all(updatePromises);
  // 5. Return the updated list sorted by display_order
  const updatedImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      } satisfies Prisma.ecommerce_mall_product_imagesWhereInput,
      orderBy: { display_order: "asc" },
      ...EcommerceMallProductImageTransformer.select(),
    });
  const totalRecords = updatedImages.length;
  const totalPages = totalRecords === 0 ? 0 : 1;
  return {
    data: await ArrayUtil.asyncMap(
      updatedImages,
      EcommerceMallProductImageTransformer.transform,
    ),
    pagination: {
      current: 1,
      limit: totalRecords,
      records: totalRecords,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
