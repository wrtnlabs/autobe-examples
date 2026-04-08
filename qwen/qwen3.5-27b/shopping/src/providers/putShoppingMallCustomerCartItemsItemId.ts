import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerCartItemTransformer } from "../transformers/ShoppingMallCustomerCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerCartItemsItemId(props: {
  customer: CustomerPayload;
  itemId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerCartItem.IUpdate;
}): Promise<IShoppingMallCustomerCartItem> {
  // Find the cart item and verify it belongs to the authenticated customer's cart
  const cartItem =
    await MyGlobal.prisma.shopping_mall_customer_cart_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        id: true,
        shopping_mall_customer_cart_id: true,
      },
    });
  // Get the customer's cart to verify ownership
  const customerCart =
    await MyGlobal.prisma.shopping_mall_customer_carts.findFirst({
      where: {
        shopping_mall_customer_id: props.customer.id,
      },
      select: { id: true },
    });
  // Verify the cart item belongs to the authenticated customer
  if (
    customerCart === null ||
    cartItem.shopping_mall_customer_cart_id !== customerCart.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Update the cart item quantity
  await MyGlobal.prisma.shopping_mall_customer_cart_items.update({
    where: { id: props.itemId },
    data: {
      quantity: props.body.quantity,
      updated_at: new Date(),
    },
  });
  // Fetch and transform the updated cart item
  const updated =
    await MyGlobal.prisma.shopping_mall_customer_cart_items.findUniqueOrThrow({
      where: { id: props.itemId },
      ...ShoppingMallCustomerCartItemTransformer.select(),
    });
  return await ShoppingMallCustomerCartItemTransformer.transform(updated);
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
// import { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
// import { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
// import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallCustomerCartItemsItemId(props: {
//   customer: CustomerPayload;
//   itemId: string & tags.Format<"uuid">;
//   body: IShoppingMallCustomerCartItem.IUpdate;
// }): Promise<IShoppingMallCustomerCartItem> {
//   await MyGlobal.prisma.shopping_mall_customer_cart_items.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_customer_cart_items.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallCustomerCartItemTransformer.select(),
//   });
//   return await ShoppingMallCustomerCartItemTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------