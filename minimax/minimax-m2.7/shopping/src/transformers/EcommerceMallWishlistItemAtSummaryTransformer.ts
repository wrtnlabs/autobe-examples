import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallWishlistItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        wishlist: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_wishlistsFindManyArgs,
        product: EcommerceMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallWishlistItem.ISummary> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
    } satisfies IEcommerceMallWishlistItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallWishlistItemAtSummaryTransformer {
//       export type Payload = Prisma.ecommerce_mall_wishlist_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             ecommerce_mall_wishlist_id: true,
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallWishlistItem.ISummary> {
//         return {
//   id: {string},
//   created_at: {string},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//         };
//       }
//     }
//--------------------------------------------------------------