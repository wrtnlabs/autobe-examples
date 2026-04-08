import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallWishlistAtSummaryTransformer } from "./EcommerceMallWishlistAtSummaryTransformer";

export namespace EcommerceMallWishlistItemAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        wishlist: EcommerceMallWishlistAtSummaryTransformer.select(),
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallWishlistItem.ISummary> {
    const mainImage = "";
    const priceMin = 0;
    const priceMax = 0;
    const inStock = false;
    const availabilityStatus = inStock ? "in_stock" : "out_of_stock";
    return {
      id: input.id,
      ecommerceMallWishlist:
        await EcommerceMallWishlistAtSummaryTransformer.transform(
          input.wishlist,
        ),
      product: {
        name: input.product.name,
        mainImage,
        priceRange: {
          min: priceMin,
          max: priceMax,
        },
        availabilityStatus,
      },
      createdAt: toISOStringSafe(input.created_at),
    };
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
//             createdAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallWishlistItem.ISummary> {
//         return {
//   id: {string},
//   ecommerceMallWishlist: {IEcommerceMallWishlist.ISummary},
//   product: {object},
//   createdAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------