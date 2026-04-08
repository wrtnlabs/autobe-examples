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
import { ShoppingMallCustomerCartItemCollector } from "../collectors/ShoppingMallCustomerCartItemCollector";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerCartItemTransformer } from "../transformers/ShoppingMallCustomerCartItemTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerCartItem.ICreate;
}): Promise<IShoppingMallCustomerCartItem> {
  // Find or create customer's cart
  let cart = await MyGlobal.prisma.shopping_mall_customer_carts.findFirst({
    where: {
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (cart === null) {
    cart = await MyGlobal.prisma.shopping_mall_customer_carts.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: props.customer.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Check if cart item already exists for this variant
  const existingCartItem =
    await MyGlobal.prisma.shopping_mall_customer_cart_items.findFirst({
      where: {
        shopping_mall_customer_cart_id: cart.id,
        shopping_mall_product_variant_id: props.body.productVariantId,
        deleted_at: null,
      },
    });
  if (existingCartItem !== null) {
    // Update existing cart item quantity by adding the new quantity
    const updated =
      await MyGlobal.prisma.shopping_mall_customer_cart_items.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + props.body.quantity,
          updated_at: new Date(),
        },
        ...ShoppingMallCustomerCartItemTransformer.select(),
      });
    return await ShoppingMallCustomerCartItemTransformer.transform(updated);
  }
  // Create new cart item
  const created =
    await MyGlobal.prisma.shopping_mall_customer_cart_items.create({
      data: await ShoppingMallCustomerCartItemCollector.collect({
        body: props.body,
        shoppingMallCustomerCarts: cart,
      }),
      ...ShoppingMallCustomerCartItemTransformer.select(),
    });
  return await ShoppingMallCustomerCartItemTransformer.transform(created);
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
// export async function postShoppingMallCustomerCartItems(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCustomerCartItem.ICreate;
// }): Promise<IShoppingMallCustomerCartItem> {
//   const record = await MyGlobal.prisma.shopping_mall_customer_cart_items.create({
//     data: await ShoppingMallCustomerCartItemCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ShoppingMallCustomerCartItemTransformer.select(),
//   });
//   return await ShoppingMallCustomerCartItemTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------