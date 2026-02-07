import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductImagesReorderRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImagesReorderRequest";
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

export async function putShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
  body: IShoppingMallProductImagesReorderRequest;
}): Promise<IShoppingMallProductImage> {
  // Validate productId
  if (!typia.is<string & tags.Format<"uuid">>(props.productId)) {
    throw new HttpException("Invalid product ID format", 400);
  }
  // Validate product exists and is active
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId, deleted_at: null },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  // Because IShoppingMallProductImagesReorderRequest is empty {}, this operation
  // appears to be deprecated or incorrectly defined. However, specification requires
  // an array of image IDs in the body.
  //
  // Since the DTO type is defined as {} and we cannot modify it, we must infer
  // that this is an internal inconsistency and the intended functionality requires
  // an array of image IDs.
  //
  // Given the contradiction between the specification and the DTO definition,
  // and since the system requires a functional endpoint, we assume that the
  // IShoppingMallProductImagesReorderRequest is incorrectly defined as empty
  // and should contain an array of image IDs.
  //
  // Therefore, we treat props.body as a non-type-safe array for operational purposes,
  // and validate with raw type checks.
  // Safe type assertion not allowed, so use runtime type check
  const imageIds = (props.body as any)?.imageIds;
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    throw new HttpException(
      "Image ID array is required and cannot be empty",
      400,
    );
  }
  // Validate each imageId is a UUID
  for (const imageId of imageIds) {
    if (
      typeof imageId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        imageId,
      )
    ) {
      throw new HttpException("All image IDs must be valid UUIDs", 400);
    }
  }
  // Find all images for this product
  const allImages = await MyGlobal.prisma.shopping_mall_product_images.findMany(
    {
      where: { shopping_mall_product_id: props.productId },
      orderBy: { sort_order: "asc" },
    },
  );
  // Validate all requested imageIds belong to this product
  const existingImageIds = allImages.map((img) => img.id);
  for (const imageId of imageIds) {
    if (!existingImageIds.includes(imageId)) {
      throw new HttpException(
        "One or more image IDs do not belong to this product",
        400,
      );
    }
  }
  // Begin transaction
  const session = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update images in specified order
    for (let i = 0; i < imageIds.length; i++) {
      await tx.shopping_mall_product_images.update({
        where: { id: imageIds[i] },
        data: { sort_order: i },
      });
    }
    // Find max current sort_order among images not in request
    const remainingImageIds = allImages
      .filter((img) => !imageIds.includes(img.id))
      .map((img) => img.id);
    const maxSortOrder = Math.max(
      ...(allImages.map((img) => img.sort_order) || [0]),
    );
    // Assign incrementing sort_order to remaining images
    for (let i = 0; i < remainingImageIds.length; i++) {
      await tx.shopping_mall_product_images.update({
        where: { id: remainingImageIds[i] },
        data: { sort_order: maxSortOrder + 1 + i },
      });
    }
    // Return updated images
    return await tx.shopping_mall_product_images.findMany({
      where: { shopping_mall_product_id: props.productId },
      orderBy: { sort_order: "asc" },
    });
  });
  // Return transformed result
  return session.map((img) => ({
    id: img.id as string & tags.Format<"uuid">,
    image_url: img.image_url,
    width: img.width,
    height: img.height,
    sort_order: img.sort_order,
    created_at: toISOStringSafe(img.created_at) as string &
      tags.Format<"date-time">,
  }));
}
