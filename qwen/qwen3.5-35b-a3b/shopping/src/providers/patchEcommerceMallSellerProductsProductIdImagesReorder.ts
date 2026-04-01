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
import { EcommerceMallProductImageAtSummaryTransformer } from "../transformers/EcommerceMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IReorder;
}): Promise<IPageIEcommerceMallProductImage.ISummary> {
  if (props.body.images.length === 0) {
    throw new HttpException("At least one image is required", 400);
  }
  const existingProduct =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_id: true,
        name: true,
        slug: true,
        base_price: true,
        status: true,
        images: { select: { id: true, display_order: true } },
      },
    });
  if (existingProduct.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const existingImages = existingProduct.images;
  const existingImageIds = new Set(existingImages.map((image) => image.id));
  const reorderImageIds = new Set(
    props.body.images.map((item) => item.image_id),
  );
  if (existingImageIds.size !== reorderImageIds.size) {
    throw new HttpException(
      "All images must be included in reorder request",
      400,
    );
  }
  for (const existingId of existingImageIds) {
    if (!reorderImageIds.has(existingId)) {
      throw new HttpException(
        "All images must be included in reorder request",
        400,
      );
    }
  }
  const displayOrders = props.body.images.map((item) => item.display_order);
  const uniqueDisplayOrders = new Set(displayOrders);
  if (uniqueDisplayOrders.size !== displayOrders.length) {
    throw new HttpException("Display orders must be unique", 400);
  }
  const minOrder = Math.min(...displayOrders);
  const maxOrder = Math.max(...displayOrders);
  if (maxOrder - minOrder + 1 !== displayOrders.length) {
    throw new HttpException(
      "Display orders must form a continuous sequence",
      400,
    );
  }
  for (const image of props.body.images) {
    const existingImage = existingImages.find(
      (img) => img.id === image.image_id,
    );
    if (!existingImage) {
      throw new HttpException("Image not found", 400);
    }
  }
  await MyGlobal.prisma.$transaction(
    props.body.images.map((image) =>
      MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: image.image_id },
        data: { display_order: image.display_order, updated_at: new Date() },
      }),
    ),
  );
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        ecommerce_mall_product_id: existingProduct.id,
        name: existingProduct.name,
        slug: existingProduct.slug,
        base_price: existingProduct.base_price,
        status: existingProduct.status,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  const updatedImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      ...EcommerceMallProductImageAtSummaryTransformer.select(),
    });
  return {
    data: await ArrayUtil.asyncMap(
      updatedImages,
      EcommerceMallProductImageAtSummaryTransformer.transform,
    ),
    pagination: {
      current: 1,
      limit: updatedImages.length,
      records: updatedImages.length,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
