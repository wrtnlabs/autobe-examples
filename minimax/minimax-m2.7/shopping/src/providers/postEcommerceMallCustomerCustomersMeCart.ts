import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import { EcommerceMallCartCollector } from "../collectors/EcommerceMallCartCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCustomersMeCart(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCart.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // Validate the product variant exists and is not soft-deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirst({
      where: { id: props.body.variantId, deleted_at: null },
    });
  if (!variant) {
    throw new HttpException("Product variant not found", 404);
  }
  // Get or create cart for the customer, then create the cart item
  // The collector handles cart creation/fetch internally using upsert pattern
  const record = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
    data: await EcommerceMallCartCollector.collect({
      body: props.body,
      ecommerceMallCustomers: { id: props.customer.id },
      ecommerceMallCustomerSessions: { id: props.customer.session_id },
    }),
    ...EcommerceMallCartItemTransformer.select(),
  });
  return await EcommerceMallCartItemTransformer.transform(record);
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
// import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
// import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCustomersMeCart(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCart.ICreate;
// }): Promise<IEcommerceMallCartItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
//     data: await EcommerceMallCartCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallCartItemTransformer.select(),
//   });
//   return await EcommerceMallCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------