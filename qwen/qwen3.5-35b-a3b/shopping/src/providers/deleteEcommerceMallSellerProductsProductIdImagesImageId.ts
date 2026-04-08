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

export async function deleteEcommerceMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify seller owns the product
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: { id: true, seller_id: true },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify image exists and belongs to the product
  const image =
    await MyGlobal.prisma.ecommerce_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: { id: true, product_id: true, deleted_at: true },
    });
  if (image.product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Check if image is already deleted
  if (image.deleted_at !== null) {
    throw new HttpException("Image has already been deleted", 409);
  }
  // 4. Count remaining non-deleted images
  const remainingCount =
    await MyGlobal.prisma.ecommerce_mall_product_images.count({
      where: {
        product_id: props.productId,
        deleted_at: null,
        id: { not: props.imageId },
      },
    });
  if (remainingCount === 0) {
    throw new HttpException(
      "At least one image must remain for this product",
      400,
    );
  }
  // 5. Soft delete the image
  await MyGlobal.prisma.ecommerce_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // No response body (204 No Content)
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
// export async function deleteEcommerceMallSellerProductsProductIdImagesImageId(props: {
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