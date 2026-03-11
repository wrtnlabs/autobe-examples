import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

export async function patchEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
  body: IEcommerceMallProductImage.IRequest;
}): Promise<IPageIEcommerceMallProductImage.ISummary> {
  // Verify seller owns the product
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId as string & tags.Format<"uuid"> },
      select: { seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query existing images for the product
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId as string & tags.Format<"uuid">,
        deleted_at: null,
      },
      orderBy: { sort_order: "asc" },
      ...EcommerceMallProductImageTransformer.select(),
    });
  // Process reorder instructions
  const sortOrderMap = new Map<string, number>();
  const existingImageMap = new Map<string, any>();
  for (const img of existingImages) {
    existingImageMap.set(img.id, img);
  }
  // Validate all reorder instructions
  const body = typia.assert<IEcommerceMallProductImage.IRequest[]>(props.body);
  for (const reorder of body) {
    const existing = existingImageMap.get(reorder.id);
    if (!existing) {
      throw new HttpException(`Image with ID ${reorder.id} not found`, 404);
    }
    if (sortOrderMap.has(String(reorder.sort_order))) {
      throw new HttpException(
        `Duplicate sort_order value ${String(reorder.sort_order)}`,
        400,
      );
    }
    sortOrderMap.set(String(reorder.sort_order), existing.id as number);
  }
  // Update sort_order for each image
  const updates = body.map((reorder) =>
    MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: reorder.id as string & tags.Format<"uuid"> },
      data: {
        sort_order: reorder.sort_order,
        updated_at: toISOStringSafe(new Date()),
      },
    }),
  );
  await Promise.all(updates);
  // Retrieve updated images with proper fields
  const updatedImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId as string & tags.Format<"uuid">,
        deleted_at: null,
      },
      orderBy: { sort_order: "asc" },
      ...EcommerceMallProductImageTransformer.select(),
    });
  const limit = 100;
  const page = 1;
  const startIndex = (page - 1) * limit;
  const paginatedData = updatedImages.slice(startIndex, startIndex + limit);
  const result = await ArrayUtil.asyncMap(
    paginatedData,
    EcommerceMallProductImageTransformer.transform,
  );
  return {
    data: result,
    pagination: {
      current: page,
      limit: limit,
      records: updatedImages.length,
      pages: Math.ceil(updatedImages.length / limit),
    } satisfies IPage.IPagination,
  };
}
