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
import { EcommerceMallProductImageAtReorderResponseTransformer } from "../transformers/EcommerceMallProductImageAtReorderResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.IReorder;
}): Promise<IEcommerceMallProductImage.IReorderResponse> {
  // Step 1: Verify product exists and belongs to seller
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, ecommerce_mall_seller_id: true },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Get existing images for validation
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: { product_id: props.productId },
      select: { id: true, display_order: true },
    });
  // Step 3: Validate all requested image IDs belong to this product
  const existingImageIds = new Set(existingImages.map((img) => img.id));
  for (const item of props.body.items) {
    if (!existingImageIds.has(item.imageId)) {
      throw new HttpException(
        "Invalid image ID: does not belong to this product",
        400,
      );
    }
  }
  // Step 4: Validate all images are included in reorder request
  if (props.body.items.length !== existingImages.length) {
    throw new HttpException("Must provide all images for reordering", 400);
  }
  // Step 5: Validate display_order forms continuous sequence starting from 0
  const orders = props.body.items
    .map((item) => item.displayOrder)
    .sort((a, b) => a - b);
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i) {
      throw new HttpException(
        "display_order must form continuous sequence starting from 0",
        400,
      );
    }
  }
  // Step 6: Perform reorder in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    for (const item of props.body.items) {
      await tx.ecommerce_mall_product_images.update({
        where: { id: item.imageId },
        data: { display_order: item.displayOrder },
      });
    }
  });
  // Step 7: Fetch updated images ordered by display_order
  const updatedImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: { product_id: props.productId },
      orderBy: { display_order: "asc" },
      ...EcommerceMallProductImageAtReorderResponseTransformer.select(),
    });
  return EcommerceMallProductImageAtReorderResponseTransformer.transform(
    updatedImages,
  );
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
// export async function patchEcommerceMallSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommerceMallProductImage.IReorder;
// }): Promise<IEcommerceMallProductImage.IReorderResponse> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
//     ...EcommerceMallProductImageAtReorderResponseTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductImageAtReorderResponseTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------