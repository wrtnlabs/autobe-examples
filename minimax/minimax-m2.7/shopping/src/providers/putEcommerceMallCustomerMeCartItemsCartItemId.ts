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

export async function putEcommerceMallCustomerMeCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCartItem | void> {
  // Query cart item to get the cart foreign key
  const cartItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        quantity: true,
        ecommerce_mall_cart_id: true,
      },
    });
  // Query cart to verify ownership
  const cart = await MyGlobal.prisma.ecommerce_mall_carts.findUniqueOrThrow({
    where: { id: cartItem.ecommerce_mall_cart_id },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
    },
  });
  // Verify cart belongs to authenticated customer (ownership check)
  if (cart.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Not Found", 404);
  }
  // Handle quantity = 0 as removal
  if (props.body.quantity === 0) {
    await MyGlobal.prisma.ecommerce_mall_cart_items.delete({
      where: { id: props.cartItemId },
    });
    return;
  }
  // If no quantity provided, return current item without update
  if (props.body.quantity === undefined) {
    const currentItem =
      await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
        where: { id: props.cartItemId },
        ...EcommerceMallCartItemTransformer.select(),
      });
    return await EcommerceMallCartItemTransformer.transform(currentItem);
  }
  // Update quantity (1-99)
  await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      quantity: props.body.quantity,
      updated_at: new Date(),
    } satisfies Prisma.ecommerce_mall_cart_itemsUpdateInput,
  });
  // Return updated cart item with full details using transformer
  const updatedItem =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...EcommerceMallCartItemTransformer.select(),
    });
  return await EcommerceMallCartItemTransformer.transform(updatedItem);
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
// export async function putEcommerceMallCustomerMeCartItemsCartItemId(props: {
//   customer: CustomerPayload;
//   cartItemId: string & tags.Format<"uuid">;
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