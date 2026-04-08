import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallCustomerCartItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_customer_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        cart: true,
        productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_customer_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerCartItem.ISummary> {
    const productVariantPayload = input.productVariant;
    const productVariant =
      await ShoppingMallProductVariantAtSummaryTransformer.transform(
        productVariantPayload,
      );
    const unitPrice = productVariant.price ?? productVariant.product.base_price;
    const subtotal = input.quantity * unitPrice;
    const available =
      input.deleted_at === null &&
      productVariantPayload.deleted_at === null &&
      productVariant.stock_quantity > 0;
    return {
      id: input.id,
      quantity: input.quantity,
      productVariant: productVariant,
      product: productVariant.product,
      subtotal: subtotal,
      available: available,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCustomerCartItemAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_customer_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             subtotal: true,
//             available: true,
//             created_at: true,
//             updated_at: true,
//             ...
//           },
//         } satisfies Prisma.shopping_mall_customer_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCustomerCartItem.ISummary> {
//         return {
//   id: {string},
//   quantity: {integer},
//   productVariant: {IShoppingMallProductVariant.ISummary},
//   product: {IShoppingMallProduct.ISummary},
//   subtotal: {number},
//   available: {boolean},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------