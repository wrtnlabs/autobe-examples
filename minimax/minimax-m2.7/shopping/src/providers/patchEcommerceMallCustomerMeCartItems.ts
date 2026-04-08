import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import { EcommerceMallCartTransformer } from "../transformers/EcommerceMallCartTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerMeCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCart> {
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findFirstOrThrow({
    where: { ecommerce_mall_customer_id: props.customer.id },
  });
  const cartItems = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: { ecommerce_mall_cart_id: cart.id },
    select: { id: true },
  });
  if (props.body.quantity !== undefined && cartItems.length > 0) {
    const cartItem = cartItems[0];
    if (props.body.quantity < 1) {
      await MyGlobal.prisma.ecommerce_mall_cart_items.delete({
        where: { id: cartItem.id },
      });
    } else {
      await MyGlobal.prisma.ecommerce_mall_cart_items.update({
        where: { id: cartItem.id },
        data: {
          quantity: props.body.quantity,
          updated_at: new Date(),
        },
      });
    }
  }
  const updatedCart =
    await MyGlobal.prisma.ecommerce_mall_carts.findFirstOrThrow({
      where: { id: cart.id },
      ...EcommerceMallCartTransformer.select(),
    });
  return EcommerceMallCartTransformer.transform(updatedCart);
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
// import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerMeCartItems(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCartItem.IUpdate;
// }): Promise<IEcommerceMallCart> {
//   const record = await MyGlobal.prisma.ecommerce_mall_carts.findFirstOrThrow({
//     ...EcommerceMallCartTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallCartTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------