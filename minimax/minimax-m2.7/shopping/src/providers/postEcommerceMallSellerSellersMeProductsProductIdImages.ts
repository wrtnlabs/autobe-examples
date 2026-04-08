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

export async function postEcommerceMallSellerSellersMeProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductImage.ICreate;
}): Promise<IEcommerceMallProductImage> {
  // Verify product exists and belongs to seller
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: props.productId },
    select: { id: true, ecommerce_mall_seller_id: true },
  });
  if (!product) {
    throw new HttpException("Product not found", 404);
  }
  if (product.ecommerce_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check existing image count
  const imageCount = await MyGlobal.prisma.ecommerce_mall_product_images.count({
    where: { product_id: props.productId },
  });
  if (imageCount >= 10) {
    throw new HttpException("Maximum 10 images per product", 400);
  }
  // Calculate display_order
  let displayOrder = 0;
  if (imageCount > 0) {
    const lastImage =
      await MyGlobal.prisma.ecommerce_mall_product_images.findFirst({
        where: { product_id: props.productId },
        orderBy: { display_order: "desc" },
        select: { display_order: true },
      });
    displayOrder = (lastImage?.display_order ?? -1) + 1;
  }
  // Create image record
  const record = await MyGlobal.prisma.ecommerce_mall_product_images.create({
    data: await EcommerceMallProductImageCollector.collect({
      body: props.body,
      ecommerceMallProducts: { id: props.productId },
      displayOrder: displayOrder,
    }),
    ...EcommerceMallProductImageTransformer.select(),
  });
  return await EcommerceMallProductImageTransformer.transform(record);
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerSellersMeProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
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