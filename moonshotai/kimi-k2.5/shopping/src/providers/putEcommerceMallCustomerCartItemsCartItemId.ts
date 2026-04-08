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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCartItem> {
  // Verify cart item exists and belongs to customer
  const cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
    where: { id: props.cartItemId },
    select: { id: true, ecommerce_mall_customer_id: true, deleted_at: true },
  });
  if (cartItem === null || cartItem.deleted_at !== null) {
    throw new HttpException("Cart item not found", 404);
  }
  if (cartItem.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Update cart item quantity
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      ...(props.body.quantity !== undefined && {
        quantity: props.body.quantity,
      }),
      updated_at: new Date(),
    },
  });
  // Fetch updated cart item with all relations
  const updated =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...EcommerceMallCartItemTransformer.select(),
    });
  return await EcommerceMallCartItemTransformer.transform(updated);
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
// export async function putEcommerceMallCustomerCartItemsCartItemId(props: {
//   customer: CustomerPayload;
//   cartItemId: string;
//   body: IEcommerceMallCartItem.IUpdate;
// }): Promise<IEcommerceMallCartItem> {
//   await MyGlobal.prisma.ecommerce_mall_cart_items.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallCartItemTransformer.select(),
//   });
//   return await EcommerceMallCartItemTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------