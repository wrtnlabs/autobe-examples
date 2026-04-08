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
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerCartItemTransformer } from "./ShoppingMallCustomerCartItemTransformer";

export namespace ShoppingMallCustomerCartTransformer {
  export type Payload = Prisma.shopping_mall_customer_cartsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        cartItems: ShoppingMallCustomerCartItemTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_customer_cartsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerCart> {
    const cartItems = await ArrayUtil.asyncMap(
      input.cartItems,
      ShoppingMallCustomerCartItemTransformer.transform,
    );
    const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      cart_items: cartItems,
      total: total,
    } satisfies IShoppingMallCustomerCart;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCustomerCartTransformer {
//       export type Payload = Prisma.shopping_mall_customer_cartsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             shopping_mall_customer_id: true,
//             cartItems: ShoppingMallCustomerCartItemTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_customer_cartsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCustomerCart> {
//         return {
//   id: {string},
//   created_at: {string},
//   updated_at: {string},
//   cart_items: await ArrayUtil.asyncMap(input.cartItems, ShoppingMallCustomerCartItemTransformer.transform),
//   total: {number},
//         };
//       }
//     }
//--------------------------------------------------------------