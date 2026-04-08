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
  // 1. Verify product exists and belongs to the seller (not soft-deleted)
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller: true },
    });
  if (product.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify image exists and belongs to the product
  const existingImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: { id: true, product_id: true, display_order: true },
    });
  if (existingImage.product_id !== props.productId) {
    throw new HttpException("Image not found for this product", 404);
  }
  // 3. Get all images for the product to validate range
  const allImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: { product_id: props.productId },
      select: { id: true, display_order: true },
      orderBy: { display_order: "asc" },
    });
  const maxOrder = allImages.length - 1;
  const currentOrder = existingImage.display_order;
  // 4. If no new display_order provided or same as current, return current state
  if (
    props.body.displayOrder === undefined ||
    props.body.displayOrder === currentOrder
  ) {
    const current =
      await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
        where: { id: props.imageId },
        ...EcommerceMallProductImageTransformer.select(),
      });
    return await EcommerceMallProductImageTransformer.transform(current);
  }
  const newOrder = props.body.displayOrder;
  // 5. Validate new order is within valid range (0 to maxOrder)
  if (newOrder < 0 || newOrder > maxOrder) {
    throw new HttpException(
      `Display order must be between 0 and ${maxOrder}`,
      400,
    );
  }
  // 6. Use transaction to atomically shift images and update target
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (newOrder < currentOrder) {
      // Moving to lower order: increment display_order of images in range [newOrder, currentOrder)
      await tx.ecommerce_mall_product_images.updateMany({
        where: {
          product_id: props.productId,
          display_order: {
            gte: newOrder,
            lt: currentOrder,
          },
        },
        data: {
          display_order: { increment: 1 },
        },
      });
    } else {
      // Moving to higher order: decrement display_order of images in range (currentOrder, newOrder]
      await tx.ecommerce_mall_product_images.updateMany({
        where: {
          product_id: props.productId,
          display_order: {
            gt: currentOrder,
            lte: newOrder,
          },
        },
        data: {
          display_order: { decrement: 1 },
        },
      });
    }
    // Update the target image with new display_order and updated_at
    await tx.ecommerce_mall_product_images.update({
      where: { id: props.imageId },
      data: {
        display_order: newOrder,
        updated_at: new Date(),
      },
    });
  });
  // 7. Return the updated image
  const updated =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...EcommerceMallProductImageTransformer.select(),
    });
  return await EcommerceMallProductImageTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductImage.IUpdate;
// }): Promise<IEcommerceMallProductImage> {
//   await MyGlobal.prisma.ecommerce_mall_product_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallProductImageTransformer.select(),
//   });
//   return await EcommerceMallProductImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------