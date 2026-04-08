import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductCollector } from "../collectors/EcommerceMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.ICreate;
}): Promise<IEcommerceMallProduct> {
  const sellerRecord = await MyGlobal.prisma.ecommerce_mall_sellers.findUnique({
    where: {
      id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      approval_status: true,
    },
  });
  if (sellerRecord === null) {
    throw new HttpException("Seller not found", 404);
  }
  if (sellerRecord.approval_status !== "approved") {
    throw new HttpException("Seller is not approved", 403);
  }
  const categoryRecord =
    await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
      where: {
        id: props.body.category_id,
        deleted_at: null,
      },
    });
  if (categoryRecord === null) {
    throw new HttpException("Category not found", 404);
  }
  if (props.body.base_price <= 0) {
    throw new HttpException("Base price must be positive", 400);
  }
  const created = await MyGlobal.prisma.ecommerce_mall_products.create({
    data: await EcommerceMallProductCollector.collect({
      body: props.body,
      ecommerceMallSellers: {
        id: sellerRecord.id,
      } satisfies IEntity,
    }),
    ...EcommerceMallProductTransformer.select(),
  });
  return await EcommerceMallProductTransformer.transform(created);
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
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerProducts(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallProduct.ICreate;
// }): Promise<IEcommerceMallProduct> {
//   const record = await MyGlobal.prisma.ecommerce_mall_products.create({
//     data: await EcommerceMallProductCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallProductTransformer.select(),
//   });
//   return await EcommerceMallProductTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------