import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallWishlistItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        customer: true,
        product: ShoppingMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallWishlistItem.ISummary> {
    return {
      id: input.id,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IShoppingMallWishlistItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ShoppingMallWishlistItemAtSummaryTransformer {
//       export type Payload = Prisma.shopping_mall_wishlist_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             shopping_mall_customer_id: true,
//             product: ShoppingMallProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.shopping_mall_wishlist_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IShoppingMallWishlistItem.ISummary> {
//         return {
//   id: {string},
//   product: await ShoppingMallProductAtSummaryTransformer.transform(input.product),
//   created_at: {string},
//   updated_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------