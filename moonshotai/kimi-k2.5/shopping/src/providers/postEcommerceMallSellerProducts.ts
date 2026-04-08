import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
  if (props.seller.approvalStatus !== "approved") {
    throw new HttpException(
      "Seller registration must be approved to create products",
      403,
    );
  }
  await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
    where: { id: props.body.categoryId },
  });
  const record = await MyGlobal.prisma.ecommerce_mall_products.create({
    data: await EcommerceMallProductCollector.collect({
      body: props.body,
      ecommerceMallSellers: { id: props.seller.id },
    }),
    ...EcommerceMallProductTransformer.select(),
  });
  return await EcommerceMallProductTransformer.transform(record);
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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