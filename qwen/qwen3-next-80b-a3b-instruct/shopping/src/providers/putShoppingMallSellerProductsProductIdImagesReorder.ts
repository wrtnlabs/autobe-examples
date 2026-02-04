import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductImage.IReorder;
}): Promise<IPageIShoppingMallProductImage> {
  // Verify seller owns the product
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, seller: { id: props.seller.id } },
  });
  if (!product) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }
  // Validate body has required value array
  if (!Array.isArray(props.body.value)) {
    throw new HttpException(
      "Reorder request must contain an array of image instructions",
      400,
    );
  }
  // Get all images currently associated with product
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { product: { id: props.productId } },
      select: {
        id: true,
        image_url: true,
        image_order: true,
      },
    });
  // Convert existing images to Map for lookup
  const existingImageMap = new Map<
    string,
    {
      imageUrl: string;
      imageOrder: number | null;
    }
  >();
  for (const img of existingImages) {
    existingImageMap.set(img.id, {
      imageUrl: img.image_url,
      imageOrder: img.image_order,
    });
  }
  // Validate every image in request exists in product's images
  // and every existing image is referenced in request (no omissions)
  const requestedImageIds = props.body.value.map((item) => item.imageId);
  const existingImageIds = existingImages.map((img) => img.id);
  // Check all requested imageIds exist in product
  for (const reqId of requestedImageIds) {
    if (!existingImageMap.has(reqId)) {
      throw new HttpException(
        `Image with id ${reqId} does not belong to product ${props.productId}`,
        400,
      );
    }
  }
  // Check no existing image is omitted from request
  for (const existingId of existingImageIds) {
    if (!requestedImageIds.includes(existingId)) {
      throw new HttpException(
        `Image with id ${existingId} is missing from reorder request`,
        400,
      );
    }
  }
  // Validate uniqueness of order values
  const imageOrders = props.body.value.map((item) => item.imageOrder);
  const uniqueImageOrders = new Set(imageOrders);
  if (imageOrders.length !== uniqueImageOrders.size) {
    throw new HttpException("Duplicate imageOrder values are not allowed", 400);
  }
  // Sort request items by desired order to perform sequential updates
  const sortedRequests = [...props.body.value].sort(
    (a, b) => a.imageOrder - b.imageOrder,
  );
  // Perform transactional update
  const updatedImages = await MyGlobal.prisma.$transaction(async (prisma) => {
    const updates: Promise<any>[] = [];
    // Assign new consecutive sequence from 0 to N-1
    // This ensures ordered sequence even if requested order had gaps or duplicates
    for (let i = 0; i < sortedRequests.length; i++) {
      const item = sortedRequests[i];
      updates.push(
        prisma.shopping_mall_product_images.update({
          where: { id: item.imageId },
          data: { image_order: i },
        }),
      );
    }
    return await Promise.all(updates);
  });
  // Re-fetch images in new order to return in response
  const finalImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: { product: { id: props.productId } },
      orderBy: { image_order: "asc" },
      select: {
        id: true,
        image_url: true,
        image_order: true,
      },
    });
  return {
    pagination: {
      current: 1,
      limit: finalImages.length,
      records: finalImages.length,
      pages: 1,
    },
    data: finalImages.map((img) => ({
      imageId: img.id,
      imageUrl: img.image_url,
      imageOrder: img.image_order === null ? undefined : img.image_order,
    })),
  };
}
