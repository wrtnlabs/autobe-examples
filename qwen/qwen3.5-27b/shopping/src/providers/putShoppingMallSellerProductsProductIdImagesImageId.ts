import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IUpdate;
}): Promise<IShoppingMallProductImage> {
  // Verify product exists and belongs to seller
  await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  // Verify image exists and belongs to product
  await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
    where: {
      id: props.imageId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
  });
  // Check uniqueness constraint if display_order is being updated
  if (props.body.display_order !== undefined) {
    const existing =
      await MyGlobal.prisma.shopping_mall_product_images.findFirst({
        where: {
          shopping_mall_product_id: props.productId,
          display_order: props.body.display_order,
          id: { not: props.imageId },
          deleted_at: null,
        },
      });
    if (existing) {
      throw new HttpException("Display order already in use", 400);
    }
  }
  // Update the image
  await MyGlobal.prisma.shopping_mall_product_images.update({
    where: { id: props.imageId },
    data: {
      ...(props.body.display_order !== undefined && {
        display_order: props.body.display_order,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch and return the updated image using transformer
  const updated =
    await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
      where: { id: props.imageId },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return await ShoppingMallProductImageTransformer.transform(updated);
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
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallSellerProductsProductIdImagesImageId(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   imageId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductImage.IUpdate;
// }): Promise<IShoppingMallProductImage> {
//   await MyGlobal.prisma.shopping_mall_product_images.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_product_images.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallProductImageTransformer.select(),
//   });
//   return await ShoppingMallProductImageTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------