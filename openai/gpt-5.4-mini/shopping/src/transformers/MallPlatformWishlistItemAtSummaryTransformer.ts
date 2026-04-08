import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { MallPlatformProductAtSummaryTransformer } from "./MallPlatformProductAtSummaryTransformer";
import { MallPlatformWishlistAtSummaryTransformer } from "./MallPlatformWishlistAtSummaryTransformer";

export namespace MallPlatformWishlistItemAtSummaryTransformer {
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
  ): Promise<IMallPlatformWishlistItem.ISummary> {
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
    } satisfies IMallPlatformWishlistItem.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace MallPlatformWishlistItemAtSummaryTransformer {
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
//             wishlist: MallPlatformWishlistAtSummaryTransformer.select(),
//             product: MallPlatformProductAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.mall_platform_wishlist_itemsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IMallPlatformWishlistItem.ISummary> {
//         return {
//   id: {string},
//   wishlist: await MallPlatformWishlistAtSummaryTransformer.transform(input.wishlist),
//   product: await MallPlatformProductAtSummaryTransformer.transform(input.product),
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------