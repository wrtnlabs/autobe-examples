import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
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
import { EcommerceMallWishlistAtSummaryTransformer } from "./EcommerceMallWishlistAtSummaryTransformer";

export namespace EcommerceMallWishlistItemTransformer {
  export type Payload = Prisma.ecommerce_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        wishlist: EcommerceMallWishlistAtSummaryTransformer.select(),
        product: EcommerceMallProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallWishlistItem> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      wishlist: await EcommerceMallWishlistAtSummaryTransformer.transform(
        input.wishlist,
      ),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
    } satisfies IEcommerceMallWishlistItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallWishlistItemTransformer {
//       export type Payload = Prisma.ecommerce_mall_wishlist_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             wishlist: EcommerceMallWishlistAtSummaryTransformer.select(),
//             product: EcommerceMallProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallWishlistItem> {
//         return {
//   id: {string},
//   created_at: {string},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   wishlist: await EcommerceMallWishlistAtSummaryTransformer.transform(input.wishlist),
//         };
//       }
//     }
//--------------------------------------------------------------