import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCartItemCollector } from "../collectors/EcommerceMallCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.ICreate;
}): Promise<IEcommerceMallCartItem> {
  // Verify product variant exists and is not deleted
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUnique({
      where: { id: props.body.productVariantId },
      select: { id: true, deleted_at: true },
    });
  if (variant === null) {
    throw new HttpException("Product variant not found", 404);
  }
  if (variant.deleted_at !== null) {
    throw new HttpException("Product variant is no longer available", 410);
  }
  // Check for existing cart item
  const existingItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findFirst({
      where: {
        customer_id: props.customer.id,
        product_variant_id: props.body.productVariantId,
        deleted_at: null,
      },
      ...EcommerceMallCartItemTransformer.select(),
    });
  let result: EcommerceMallCartItemTransformer.Payload;
  if (existingItem !== null) {
    // Update existing cart item with combined quantity
    const updatedQuantity = existingItem.quantity + props.body.quantity;
    result = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: existingItem.id },
      data: {
        quantity: updatedQuantity,
        updated_at: new Date(),
      },
      ...EcommerceMallCartItemTransformer.select(),
    });
  } else {
    // Create new cart item
    result = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
      data: await EcommerceMallCartItemCollector.collect({
        body: props.body,
        ecommerceMallCustomers: { id: props.customer.id },
      }),
      ...EcommerceMallCartItemTransformer.select(),
    });
  }
  return await EcommerceMallCartItemTransformer.transform(result);
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
// import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallCustomerCartItems(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCartItem.ICreate;
// }): Promise<IEcommerceMallCartItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cart_items.create({
//     data: await EcommerceMallCartItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallCartItemTransformer.select(),
//   });
//   return await EcommerceMallCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------