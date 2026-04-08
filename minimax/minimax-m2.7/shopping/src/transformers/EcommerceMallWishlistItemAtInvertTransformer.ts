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

export namespace EcommerceMallWishlistItemAtInvertTransformer {
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
  ): Promise<IEcommerceMallWishlistItem.IInvert> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      wishlist: await EcommerceMallWishlistAtSummaryTransformer.transform(
        input.wishlist,
      ),
    } satisfies IEcommerceMallWishlistItem.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallWishlistItemAtInvertTransformer {
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
//       export async function transform(input: Payload): Promise<IEcommerceMallWishlistItem.IInvert> {
//         return {
//   id: {string},
//   createdAt: {string},
//   product: await EcommerceMallProductAtSummaryTransformer.transform(input.product),
//   wishlist: await EcommerceMallWishlistAtSummaryTransformer.transform(input.wishlist),
//         };
//       }
//     }
//--------------------------------------------------------------