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

export async function deleteEcommerceMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string;
}): Promise<void> {
  const cartItem = await MyGlobal.prisma.ecommerce_mall_cart_items.findUnique({
    where: {
      id: props.cartItemId,
      deleted_at: null,
    },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
    },
  });
  if (cartItem === null) {
    throw new HttpException("Cart item not found", 404);
  }
  if (cartItem.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: {
      id: props.cartItemId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
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
// export async function deleteEcommerceMallCustomerCartItemsCartItemId(props: {
//   customer: CustomerPayload;
//   cartItemId: string;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------