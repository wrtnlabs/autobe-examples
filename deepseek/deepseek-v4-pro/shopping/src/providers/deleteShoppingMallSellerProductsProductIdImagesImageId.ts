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

export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Look up product by productId — must exist and not be soft-deleted
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      deleted_at: true,
      seller: {
        select: {
          suspended_at: true,
        },
      },
    },
  });
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // 2. Look up image by imageId
  const image = await MyGlobal.prisma.shopping_mall_product_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      shopping_mall_product_id: true,
      display_order: true,
    },
  });
  if (image === null) {
    throw new HttpException("Image not found", 404);
  }
  // 3. Verify image's shopping_mall_product_id matches productId
  if (image.shopping_mall_product_id !== props.productId) {
    throw new HttpException("Image not found", 404);
  }
  // 4. Authorize: requesting user must be the seller who owns the product
  if (product.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Verify seller is not suspended
  if (product.seller.suspended_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // 6. Record the display_order of the image being deleted
  const deletedDisplayOrder: number = image.display_order;
  // 7. Delete the image record
  await MyGlobal.prisma.shopping_mall_product_images.delete({
    where: { id: props.imageId },
  });
  // 8. Decrement display_order for remaining images with higher display_order
  await MyGlobal.prisma.shopping_mall_product_images.updateMany({
    where: {
      shopping_mall_product_id: props.productId,
      display_order: { gt: deletedDisplayOrder },
    },
    data: {
      display_order: { decrement: 1 },
      updated_at: new Date(),
    },
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteShoppingMallSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------