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

export async function deleteEcommerceMallSellerProductsProductIdImagesProductImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  productImageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify product exists and check ownership
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  // Authorization: seller must own the product or be an admin
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the image to verify it exists and belongs to this product
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.productImageId },
      select: { id: true, product_id: true, display_order: true },
    });
  // Verify the image belongs to the specified product
  if (image.product_id !== props.productId) {
    throw new HttpException("Product image not found for this product", 404);
  }
  // Perform soft delete
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.productImageId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Reorder remaining images to maintain sequential ordering
  const remainingImages =
    await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
      where: {
        product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
    });
  // Reassign display_order values sequentially starting from 0
  for (let i = 0; i < remainingImages.length; i++) {
    await MyGlobal.prisma.ecommerce_mall_product_images.update({
      where: { id: remainingImages[i].id },
      data: {
        display_order: i,
        updated_at: new Date(),
      },
    });
  }
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallSellerProductsProductIdImagesProductImageId(props: {
//   seller: SellerPayload;
//   productId: string;
//   productImageId: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------