import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductCollector } from "../collectors/ShoppingMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductTransformer } from "../transformers/ShoppingMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const sellerRecord =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { approval_status: true, suspended_at: true },
    });
  if (sellerRecord.approval_status !== "approved") {
    throw new HttpException("Seller is not approved", 403);
  }
  if (sellerRecord.suspended_at !== null) {
    throw new HttpException("Seller is suspended", 403);
  }
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_category_id },
    select: { id: true },
  });
  const record = await MyGlobal.prisma.shopping_mall_products.create({
    data: await ShoppingMallProductCollector.collect({
      body: props.body,
      shoppingMallSellers: { id: props.seller.id },
      shoppingMallSellerSessions: { id: props.seller.session_id },
    }),
    ...ShoppingMallProductTransformer.select(),
  });
  return await ShoppingMallProductTransformer.transform(record);
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
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// import { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postShoppingMallSellerProducts(props: {
//   seller: SellerPayload;
//   body: IShoppingMallProduct.ICreate;
// }): Promise<IShoppingMallProduct> {
//   const record = await MyGlobal.prisma.shopping_mall_products.create({
//     data: await ShoppingMallProductCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallProductTransformer.select(),
//   });
//   return await ShoppingMallProductTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------