import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemTransformer } from "../transformers/ShoppingMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IShoppingMallCartItem.IUpdate;
}): Promise<IShoppingMallCartItem> {
  const cartItem =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: { id: true, shopping_mall_customer_id: true },
    });
  if (cartItem.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      quantity: props.body.quantity,
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...ShoppingMallCartItemTransformer.select(),
    });
  return await ShoppingMallCartItemTransformer.transform(updated);
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
// import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallCustomerCartItemsCartItemId(props: {
//   customer: CustomerPayload;
//   cartItemId: string & tags.Format<"uuid">;
//   body: IShoppingMallCartItem.IUpdate;
// }): Promise<IShoppingMallCartItem> {
//   await MyGlobal.prisma.shopping_mall_cart_items.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_cart_items.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallCartItemTransformer.select(),
//   });
//   return await ShoppingMallCartItemTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------