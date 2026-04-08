import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";
import { MallPlatformWishlistAtSummaryTransformer } from "./MallPlatformWishlistAtSummaryTransformer";

export namespace MallPlatformWishlistItemTransformer {
  export type Payload = Prisma.mall_platform_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        wishlist: MallPlatformWishlistAtSummaryTransformer.select(),
        product: MallPlatformProductAtSummaryTransformer.select(),
      },
    } satisfies Prisma.mall_platform_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformWishlistItem> {
    return {
      id: input.id,
      wishlist: await MallPlatformWishlistAtSummaryTransformer.transform(
        input.wishlist,
      ),
      product: await MallPlatformProductAtSummaryTransformer.transform(
        input.product,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    } satisfies IMallPlatformWishlistItem;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformWishlistItemTransformer {
//       export type Payload = Prisma.mall_platform_wishlist_itemsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             mall_platform_wishlist_id: true,
//             product: MallPlatformProductAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.mall_platform_wishlist_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformWishlistItem> {
//         return {
//   id: {string},
//   wishlist: {IMallPlatformWishlist.ISummary},
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------