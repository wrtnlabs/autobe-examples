import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
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
import { ECommerceMallProductCollector } from "../collectors/ECommerceMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallProductTransformer } from "../transformers/ECommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSellerProducts(props: {
  seller: SellerPayload;
  body: IECommerceMallProduct.ICreate;
}): Promise<IECommerceMallProduct> {
  // 1. Verify seller exists and has approved approval_status
  const sellerRecord =
    await MyGlobal.prisma.e_commerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.seller.id },
      select: { id: true, approval_status: true },
    });
  if (sellerRecord.approval_status !== "approved") {
    throw new HttpException(
      "Administrator approval is required before creating products. Your seller account status is: " +
        sellerRecord.approval_status,
      403,
    );
  }
  // 2. Validate category exists and is not soft-deleted (if provided)
  if (props.body.category_id !== undefined && props.body.category_id !== null) {
    await MyGlobal.prisma.e_commerce_mall_categories.findFirstOrThrow({
      where: { id: props.body.category_id, deleted_at: null },
      select: { id: true },
    });
  }
  // 3. Create product record using the collector
  const record = await MyGlobal.prisma.e_commerce_mall_products.create({
    data: await ECommerceMallProductCollector.collect({
      body: props.body,
      eCommerceMallSellers: { id: props.seller.id },
    }),
    ...ECommerceMallProductTransformer.select(),
  });
  // 4. Transform and return the full product entity
  return await ECommerceMallProductTransformer.transform(record);
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
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
// import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSellerProducts(props: {
//   seller: SellerPayload;
//   body: IECommerceMallProduct.ICreate;
// }): Promise<IECommerceMallProduct> {
//   const record = await MyGlobal.prisma.e_commerce_mall_products.create({
//     data: await ECommerceMallProductCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallProductTransformer.select(),
//   });
//   return await ECommerceMallProductTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------