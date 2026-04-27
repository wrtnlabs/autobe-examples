import { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
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
import { ECommerceMallCartItemCollector } from "../collectors/ECommerceMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallCartItemTransformer } from "../transformers/ECommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postECommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IECommerceMallCartItem.ICreate;
}): Promise<IECommerceMallCartItem> {
  // Validate the product variant exists and is not soft-deleted
  await MyGlobal.prisma.e_commerce_mall_product_variants.findUniqueOrThrow({
    where: {
      id: props.body.product_variant_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Use upsert with the @@unique composite constraint:
  // - No existing cart item for this customer+variant: create new
  // - Existing cart item found: increment quantity (combine behavior)
  const record = await MyGlobal.prisma.e_commerce_mall_cart_items.upsert({
    where: {
      e_commerce_mall_customer_id_e_commerce_mall_product_variant_id: {
        e_commerce_mall_customer_id: props.customer.id,
        e_commerce_mall_product_variant_id: props.body.product_variant_id,
      },
    },
    create: await ECommerceMallCartItemCollector.collect({
      body: props.body,
      eCommerceMallCustomers: { id: props.customer.id },
      eCommerceMallCustomerSessions: { id: props.customer.session_id },
    }),
    update: {
      quantity: { increment: props.body.quantity },
      updated_at: new Date(),
    },
    ...ECommerceMallCartItemTransformer.select(),
  });
  return await ECommerceMallCartItemTransformer.transform(record);
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
// import { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
// import { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
// import { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallCustomerCartItems(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallCartItem.ICreate;
// }): Promise<IECommerceMallCartItem> {
//   const record = await MyGlobal.prisma.e_commerce_mall_cart_items.create({
//     data: await ECommerceMallCartItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallCartItemTransformer.select(),
//   });
//   return await ECommerceMallCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------