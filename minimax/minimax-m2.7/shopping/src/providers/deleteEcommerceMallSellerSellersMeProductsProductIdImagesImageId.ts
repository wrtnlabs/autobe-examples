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

export async function deleteEcommerceMallSellerSellersMeProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify product exists and belongs to the authenticated seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
      deleted_at: true,
    },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException(
      "You do not have permission to delete images from this product",
      403,
    );
  }
  // 2. Verify image exists and belongs to the product
  const image = await MyGlobal.prisma.ecommerce_mall_product_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      product_id: true,
      display_order: true,
    },
  });
  if (!image || image.product_id !== props.productId) {
    throw new HttpException("Image not found", 404);
  }
  const wasMainThumbnail = image.display_order === 0;
  // 3. Delete the image record
  await MyGlobal.prisma.ecommerce_mall_product_images.delete({
    where: { id: props.imageId },
  });
  // 4. If deleted image was main thumbnail and other images exist, promote next image
  if (wasMainThumbnail) {
    const nextImage =
      await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
        where: { product_id: props.productId },
        orderBy: { display_order: "asc" },
        select: { id: true, display_order: true },
      });
    if (nextImage) {
      await MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: nextImage.id },
        data: { display_order: 0 },
      });
    }
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
// export async function deleteEcommerceMallSellerSellersMeProductsProductIdImagesImageId(props: {
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