import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ECommerceMallProductImageCollector } from "../collectors/ECommerceMallProductImageCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallProductImageTransformer } from "../transformers/ECommerceMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IECommerceMallProductImage.ICreate;
}): Promise<IECommerceMallProductImage> {
  // Validate product exists and belongs to the requesting seller
  const product =
    await MyGlobal.prisma.e_commerce_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        id: true,
        seller_id: true,
      },
    });
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate seller approval status is 'approved'
  const seller =
    await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
      where: {
        id: props.seller.id,
      },
      select: {
        approval_status: true,
      },
    });
  if (seller.approval_status !== "approved") {
    throw new HttpException("Forbidden", 403);
  }
  const record = await MyGlobal.prisma.e_commerce_mall_product_images.create({
    data: await ECommerceMallProductImageCollector.collect({
      body: props.body,
      eCommerceMallProducts: {
        id: props.productId,
      } satisfies IEntity,
      eCommerceMallSellers: {
        id: props.seller.id,
      } satisfies IEntity,
      eCommerceMallSellerSessions: {
        id: props.seller.session_id,
      } satisfies IEntity,
    }),
    ...ECommerceMallProductImageTransformer.select(),
  });
  return await ECommerceMallProductImageTransformer.transform(record);
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
// import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSellerProductsProductIdImages(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IECommerceMallProductImage.ICreate;
// }): Promise<IECommerceMallProductImage> {
//   const record = await MyGlobal.prisma.e_commerce_mall_product_images.create({
//     data: await ECommerceMallProductImageCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallProductImageTransformer.select(),
//   });
//   return await ECommerceMallProductImageTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------