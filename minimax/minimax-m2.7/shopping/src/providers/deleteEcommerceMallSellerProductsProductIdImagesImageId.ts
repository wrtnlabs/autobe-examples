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
  // 1. Verify product exists and seller owns it
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_seller_id: true,
      },
    });
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Verify image exists and belongs to this product
  const image = await MyGlobal.prisma.ecommerce_mall_product_images.findUnique({
    where: { id: props.imageId },
    select: {
      id: true,
      product_id: true,
      display_order: true,
    },
  });
  if (image === null || image.product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Capture display_order before deletion
  const deletedDisplayOrder = image.display_order;
  // 4. Delete the image
  await MyGlobal.prisma.ecommerce_mall_product_images.delete({
    where: { id: props.imageId },
  });
  // 5. Post-delete cascade: promote new main thumbnail if deleted image was order=0
  if (deletedDisplayOrder === 0) {
    const nextMain =
      await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
        where: { product_id: props.productId },
        orderBy: { display_order: "asc" },
        select: { id: true },
      });
    if (nextMain !== null) {
      await MyGlobal.prisma.ecommerce_mall_product_images.update({
        where: { id: nextMain.id },
        data: {
          display_order: 0,
          updated_at: new Date(),
        },
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