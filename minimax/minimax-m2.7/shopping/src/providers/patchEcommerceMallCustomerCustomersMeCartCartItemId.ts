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

export async function patchEcommerceMallCustomerCustomersMeCartCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IEcommerceMallCartItem.IUpdate;
}): Promise<IEcommerceMallCartItem> {
  // Find cart item with cart relation to verify ownership
  const record =
    await MyGlobal.prisma.ecommerce_mall_cart_items.findFirstOrThrow({
      ...EcommerceMallCartItemTransformer.select(),
      where: {
        id: props.cartItemId,
        cart: {
          ecommerce_mall_customer_id: props.customer.id,
        },
      },
    });
  // Handle quantity=0 as removal operation
  if (props.body.quantity === 0) {
    await MyGlobal.prisma.ecommerce_mall_cart_items.delete({
      where: { id: props.cartItemId },
    });
    // Return the record before deletion for response
    return await EcommerceMallCartItemTransformer.transform(record);
  }
  // Update quantity and timestamp
  const updated = await MyGlobal.prisma.ecommerce_mall_cart_items.update({
    where: { id: props.cartItemId },
    data: {
      quantity: props.body.quantity,
      updated_at: new Date(),
    },
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
// import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
// import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerCustomersMeCartCartItemId(props: {
//   customer: CustomerPayload;
//   cartItemId: string & tags.Format<"uuid">;
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