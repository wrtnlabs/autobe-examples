import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallProductVariantAtSummaryTransformer } from "./ShoppingMallProductVariantAtSummaryTransformer";

export namespace ShoppingMallCartItemTransformer {
  export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        created_at: true,
        updated_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        productVariant: {
          select: {
            ...ShoppingMallProductVariantAtSummaryTransformer.select().select,
            deleted_at: true,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCartItem> {
    const variant =
      await ShoppingMallProductVariantAtSummaryTransformer.transform(
        input.productVariant,
      );
    const available =
      input.productVariant.deleted_at === null &&
      variant.stock_quantity >= input.quantity;
    return {
      id: input.id,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      productVariant: variant,
      quantity: input.quantity,
      available,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IShoppingMallCartItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallCartItemTransformer {
//       export type Payload = Prisma.shopping_mall_cart_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             quantity: true,
//             created_at: true,
//             updated_at: true,
//             customer: ShoppingMallCustomerAtSummaryTransformer.select(),
//             productVariant: ShoppingMallProductVariantAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_cart_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallCartItem> {
//         return {
//   id: {string},
//   customer: await ShoppingMallCustomerAtSummaryTransformer.transform(input.customer),
//   productVariant: await ShoppingMallProductVariantAtSummaryTransformer.transform(input.productVariant),
//   quantity: {integer},
//   available: {boolean},
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------