import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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

export async function postEcommerceMallSellerSellersMeProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.ICreate;
}): Promise<IEcommerceMallProduct> {
  // Verify seller is approved to create products
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
    where: {
      id: props.seller.id,
      deleted_at: null,
    },
    select: {
      id: true,
      approval_status: true,
    },
  });
  if (seller === null) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.approval_status !== "approved") {
    throw new HttpException(
      "Seller account is not approved. Only approved sellers can create products.",
      403,
    );
  }
  // Verify category exists and is not deleted
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findFirst({
    where: {
      id: props.body.categoryId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
    },
  });
  if (category === null) {
    throw new HttpException("Category not found or has been deleted", 400);
  }
  // Create product using collector
  const created = await MyGlobal.prisma.ecommerce_mall_products.create({
    data: await EcommerceMallProductCollector.collect({
      body: props.body,
      seller: { id: props.seller.id },
    }),
    ...EcommerceMallProductTransformer.select(),
  });
  // Create immutable product snapshot for audit trail
  await MyGlobal.prisma.ecommerce_mall_product_snapshots.create({
    data: {
      id: v4(),
      ecommerce_mall_product_id: created.id,
      ecommerce_mall_seller_id: props.seller.id,
      name: created.name,
      description: created.description,
      base_price: created.base_price,
      category_name: category.name,
      created_at: new Date(),
    },
  });
  // Return created product with all computed fields
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
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerSellersMeProducts(props: {
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