import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallWishlistItemCollector } from "../collectors/EcommerceMallWishlistItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallWishlistItemTransformer } from "../transformers/EcommerceMallWishlistItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerWishlistItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallWishlistItem.ICreate;
}): Promise<IEcommerceMallWishlistItem> {
  // Verify product exists and is not deleted
  await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
    where: {
      id: props.body.product_id,
      deleted_at: null,
    },
  });
  // Check for existing wishlist item (idempotent behavior)
  const existing =
    await MyGlobal.prisma.ecommerce_mall_wishlist_items.findFirst({
      where: {
        customer_id: props.customer.id,
        product_id: props.body.product_id,
      },
      ...EcommerceMallWishlistItemTransformer.select(),
    });
  if (existing !== null) {
    return await EcommerceMallWishlistItemTransformer.transform(existing);
  }
  // Create new wishlist item
  const created = await MyGlobal.prisma.ecommerce_mall_wishlist_items.create({
    data: await EcommerceMallWishlistItemCollector.collect({
      body: props.body,
      customer: props.customer,
      session: { id: props.customer.session_id },
    }),
    ...EcommerceMallWishlistItemTransformer.select(),
  });
  return await EcommerceMallWishlistItemTransformer.transform(created);
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
// import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerWishlistItems(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallWishlistItem.ICreate;
// }): Promise<IEcommerceMallWishlistItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_wishlist_items.create({
//     data: await EcommerceMallWishlistItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallWishlistItemTransformer.select(),
//   });
//   return await EcommerceMallWishlistItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------