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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallCartItemTransformer } from "../transformers/ECommerceMallCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putECommerceMallCustomerCartItemsCartItemId(props: {
  customer: CustomerPayload;
  cartItemId: string & tags.Format<"uuid">;
  body: IECommerceMallCartItem.IUpdate;
}): Promise<IECommerceMallCartItem> {
  // Step 1: Find the cart item to validate existence and ownership
  const cartItem =
    await MyGlobal.prisma.e_commerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      select: {
        id: true,
        e_commerce_mall_customer_id: true,
        deleted_at: true,
      },
    });
  // Step 2: Validate cart item is not soft-deleted
  if (cartItem.deleted_at !== null) {
    throw new HttpException("Cart item not found", 404);
  }
  // Step 3: Validate customer ownership
  if (cartItem.e_commerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: If no quantity provided, return current state unchanged
  if (props.body.quantity === undefined) {
    const current =
      await MyGlobal.prisma.e_commerce_mall_cart_items.findUniqueOrThrow({
        where: { id: props.cartItemId },
        ...ECommerceMallCartItemTransformer.select(),
      });
    return await ECommerceMallCartItemTransformer.transform(current);
  }
  // Step 5: Handle quantity === 0 (soft-delete)
  if (props.body.quantity === 0) {
    await MyGlobal.prisma.e_commerce_mall_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        quantity: 0,
        updated_at: new Date(),
        deleted_at: new Date(),
      },
    });
  } else {
    // Step 6: Update quantity (quantity > 0)
    await MyGlobal.prisma.e_commerce_mall_cart_items.update({
      where: { id: props.cartItemId },
      data: {
        quantity: props.body.quantity,
        updated_at: new Date(),
      },
    });
  }
  // Step 7: Return the updated record using the transformer
  const updated =
    await MyGlobal.prisma.e_commerce_mall_cart_items.findUniqueOrThrow({
      where: { id: props.cartItemId },
      ...ECommerceMallCartItemTransformer.select(),
    });
  return await ECommerceMallCartItemTransformer.transform(updated);
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
// export async function putECommerceMallCustomerCartItemsCartItemId(props: {
//   customer: CustomerPayload;
//   cartItemId: string & tags.Format<"uuid">;
//   body: IECommerceMallCartItem.IUpdate;
// }): Promise<IECommerceMallCartItem> {
//   await MyGlobal.prisma.e_commerce_mall_cart_items.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.e_commerce_mall_cart_items.findUniqueOrThrow({
//     where: { ... },
//     ...ECommerceMallCartItemTransformer.select(),
//   });
//   return await ECommerceMallCartItemTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------