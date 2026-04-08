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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemTransformer } from "../transformers/EcommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerMeCart(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCartItem> {
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findFirst({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
    },
    select: {
      id: true,
    },
  });
  if (!cart) {
    throw new HttpException("Cart not found", 404);
  }
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: {
      ecommerce_mall_cart_id: cart.id,
    },
    ...EcommerceMallCartItemTransformer.select(),
  });
  if (cartItems.length === 0) {
    throw new HttpException("Cart is empty", 404);
  }
  const cartItem = cartItems[0];
  if (props.body.quantity === 0) {
    await MyGlobal.prisma.ecommerce_mall_cart_items.delete({
      where: { id: cartItem.id },
    });
    throw new HttpException("Cart item removed", 200);
  }
  if (props.body.quantity !== undefined) {
    const updated = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
      where: { id: cartItem.id },
      data: {
        quantity: props.body.quantity,
        updated_at: new Date(),
      },
      ...EcommerceMallCartItemTransformer.select(),
    });
    return await EcommerceMallCartItemTransformer.transform(updated);
  }
  return await EcommerceMallCartItemTransformer.transform(cartItem);
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
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerMeCart(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCartItem.IUpdate;
// }): Promise<IEcommerceMallCartItem> {
//   const record = await MyGlobal.prisma.ecommerce_mall_cart_items.findFirstOrThrow({
//     ...EcommerceMallCartItemTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------