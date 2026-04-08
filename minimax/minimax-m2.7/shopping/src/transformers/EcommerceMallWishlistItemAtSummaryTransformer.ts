import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

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
        product: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_productsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallWishlistItem.ISummary> {
    return {
      createdAt: input.created_at.toISOString(),
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
//             ecommerce_mall_product_id: true,
//           },
//         } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallWishlistItem.ISummary> {
//         return {
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------