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

export async function patchShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.IReorder;
}): Promise<IShoppingMallProductImage> {
  // 1. Verify product exists, not deleted, and owned by seller
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
        shopping_mall_seller_id: props.seller.id,
      },
      select: {
        id: true,
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  // 2. Get all non-deleted images for this product
  const existingImages =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // 3. Validate all image IDs in request belong to this product
  for (const imageId of props.body.images) {
    if (!existingImages.some((img) => img.id === imageId)) {
      throw new HttpException("Image does not belong to this product", 400);
    }
  }
  // 4. Update display_order for each image sequentially
  for (let i = 0; i < props.body.images.length; i++) {
    await MyGlobal.prisma.shopping_mall_product_images.update({
      where: { id: props.body.images[i] },
      data: {
        display_order: i + 1,
        updated_at: new Date(),
      },
    });
  }
  // 5. Create product snapshot for audit trail
  await MyGlobal.prisma.shopping_mall_product_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_product_id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      created_at: new Date(),
    },
  });
  // 6. Return the first image (new main thumbnail)
  const firstImage =
    await MyGlobal.prisma.shopping_mall_product_images.findFirstOrThrow({
      where: {
        shopping_mall_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: { display_order: "asc" },
      ...ShoppingMallProductImageTransformer.select(),
    });
  return await ShoppingMallProductImageTransformer.transform(firstImage);
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
// export async function patchShoppingMallSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductImage.IReorder;
// }): Promise<IShoppingMallProductImage> {
//   const record = await MyGlobal.prisma.shopping_mall_product_images.findFirstOrThrow({
//     ...ShoppingMallProductImageTransformer.select(),
//     where: { ... },
//   });
//   return await ShoppingMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------