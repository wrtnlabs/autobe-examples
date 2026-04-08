import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceMallCustomerCustomersMeCartCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify cart item exists and belongs to the authenticated customer
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        ecommerce_mall_cart_id: true,
        cart: {
          select: {
            id: true,
            ecommerce_mall_customer_id: true,
          },
        },
      },
    });
  // Verify ownership: cart item must belong to the authenticated customer
  if (cartItem.cart.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Not Found", 404);
  }
  // Delete the cart item
  await MyGlobal.prisma.ecommerce_mall_cart_items.delete({
    where: { id: props.cartItemId },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteEcommerceMallCustomerCustomersMeCartCartItemId(props: {
//   customer: CustomerPayload;
//   cartItemId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------