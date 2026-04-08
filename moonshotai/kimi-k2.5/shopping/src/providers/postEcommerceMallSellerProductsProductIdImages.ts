import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductImageCollector } from "../collectors/EcommerceMallProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductImageTransformer } from "../transformers/EcommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string;
  body: IEcommerceMallProductImage.ICreate;
}): Promise<IEcommerceMallProductImage> {
  // Verify product exists and check ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
      ecommerce_mall_seller_id: true,
      deleted_at: true,
    },
  });
  // 404 if product not found or soft-deleted
  if (product === null || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  // 403 if seller doesn't own this product (cross-seller image management blocked)
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Create the image using collector which handles display_order calculation
  const created = await MyGlobal.prisma.ecommerce_mall_product_images.create({
    data: await EcommerceMallProductImageCollector.collect({
      body: props.body,
      ecommerceMallProducts: { id: product.id },
    }),
    ...EcommerceMallProductImageTransformer.select(),
  });
  return await EcommerceMallProductImageTransformer.transform(created);
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string;
//   body: IEcommerceMallProductImage.ICreate;
// }): Promise<IEcommerceMallProductImage> {
//   const record = await MyGlobal.prisma.ecommerce_mall_product_images.create({
//     data: await EcommerceMallProductImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallProductImageTransformer.select(),
//   });
//   return await EcommerceMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------