import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductImageAtSummaryTransformer } from "../transformers/EcommerceMallProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallProductsProductIdImages(props: {
  productId: string;
  body: IEcommerceMallProductImage.IUpdateOrder;
}): Promise<IEcommerceMallProductImage.ISummary> {
  // Verify product exists
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  // Fetch all non-deleted images for the product
  const existingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existingImages.length === 0) {
    throw new HttpException("No images found for this product", 404);
  }
  const existingIds = new Set(existingImages.map((img) => img.id));
  const requestedIds = props.body.imageIds;
  // Validate all requested IDs belong to this product
  for (const id of requestedIds) {
    if (!existingIds.has(id)) {
      throw new HttpException(
        "Invalid image ID: not found for this product",
        400,
      );
    }
  }
  // Check for duplicates
  if (new Set(requestedIds).size !== requestedIds.length) {
    throw new HttpException("Duplicate image IDs in request", 400);
  }
  // Validate all images are included in the reorder request
  if (requestedIds.length !== existingImages.length) {
    throw new HttpException(
      "Reorder request must include all product images",
      400,
    );
  }
  // Update display_order for each image in transaction
  const now = typia.assert<string & tags.Format<"date-time">>(
    new Date().toISOString(),
  );
  await MyGlobal.prisma.$transaction(
    requestedIds.map((id, index) =>
      MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id },
        data: {
          display_order: index,
          updated_at: now,
        },
      }),
    ),
  );
  // Return the new main thumbnail (display_order 0)
  const firstImage =
    await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
      where: {
        product_id: props.productId,
        display_order: 0,
        deleted_at: null,
      },
      ...EcommerceMallProductImageAtSummaryTransformer.select(),
    });
  return await EcommerceMallProductImageAtSummaryTransformer.transform(
    firstImage,
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
// export async function patchEcommerceMallProductsProductIdImages(props: {
//   productId: string;
//   body: IEcommerceMallProductImage.IUpdateOrder;
// }): Promise<IEcommerceMallProductImage.ISummary> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_images.findFirstOrThrow({
//     ...EcommerceMallProductImageAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallProductImageAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------