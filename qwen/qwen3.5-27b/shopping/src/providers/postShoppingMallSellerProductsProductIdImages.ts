import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductImageCollector } from "../collectors/ShoppingMallProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
        deleted_at: null,
        shopping_mall_seller_id: props.seller.id,
      },
    });
  const record = await MyGlobal.prisma.shopping_mall_product_images.create({
    data: await ShoppingMallProductImageCollector.collect({
      body: props.body,
      shoppingMallProducts: {
        id: product.id,
      } satisfies IEntity,
    }),
    ...ShoppingMallProductImageTransformer.select(),
  });
  return await ShoppingMallProductImageTransformer.transform(record);
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
// export async function postShoppingMallSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IShoppingMallProductImage.ICreate;
// }): Promise<IShoppingMallProductImage> {
//   const record = await MyGlobal.prisma.shopping_mall_product_images.create({
//     data: await ShoppingMallProductImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallProductImageTransformer.select(),
//   });
//   return await ShoppingMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------