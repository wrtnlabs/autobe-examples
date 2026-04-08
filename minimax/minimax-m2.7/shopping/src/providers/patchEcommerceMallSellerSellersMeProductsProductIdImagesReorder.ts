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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerSellersMeProductsProductIdImagesReorder(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IReorder;
}): Promise<void> {
  // Validate reorderItems is not empty
  if (!props.body.reorderItems || props.body.reorderItems.length === 0) {
    throw new HttpException("Reorder items cannot be empty", 400);
  }
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, ecommerce_mall_seller_id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Get all images for this product
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: { product_id: props.productId },
      select: { id: true, display_order: true },
    });
  if (existingImages.length === 0) {
    throw new HttpException("Product has no images to reorder", 400);
  }
  // Validate all imageIds exist and belong to this product
  const existingImageIds = new Set(existingImages.map((img) => img.id));
  const invalidImageIds = props.body.reorderItems.filter(
    (item) => !existingImageIds.has(item.imageId),
  );
  if (invalidImageIds.length > 0) {
    throw new HttpException(
      `Image(s) not found: ${invalidImageIds.map((i) => i.imageId).join(", ")}`,
      404,
    );
  }
  // Check for duplicate newDisplayOrder values in the request
  const displayOrders = props.body.reorderItems.map(
    (item) => item.newDisplayOrder,
  );
  const uniqueDisplayOrders = new Set(displayOrders);
  if (displayOrders.length !== uniqueDisplayOrders.size) {
    throw new HttpException("Duplicate display order values in request", 409);
  }
  // Atomic transaction for reordering
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Assign new display_order values from reorderItems
    for (const item of props.body.reorderItems) {
      await tx.ecommerce_mall_product_images.update({
        where: { id: item.imageId },
        data: {
          display_order: item.newDisplayOrder,
          updated_at: new Date(),
        },
      });
    }
    // Step 2: Renumber all images for this product sequentially from 1
    const allImages = await tx.ecommerce_mall_product_images.findMany({
      where: { product_id: props.productId },
      orderBy: { display_order: "asc" },
      select: { id: true },
    });
    for (let index = 0; index < allImages.length; index++) {
      await tx.ecommerce_mall_product_images.update({
        where: { id: allImages[index].id },
        data: {
          display_order: index + 1,
          updated_at: new Date(),
        },
      });
    }
  });
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
// export async function patchEcommerceMallSellerSellersMeProductsProductIdImagesReorder(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductImage.IReorder;
// }): Promise<void> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------