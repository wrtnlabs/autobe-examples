import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallProductAtSummaryTransformer } from "./EcommerceMallProductAtSummaryTransformer";

export namespace EcommerceMallWishlistItemAtSummaryTransformer {
  // 1. Payload type first
  export type Payload = Prisma.ecommerce_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
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
        product: EcommerceMallProductAtSummaryTransformer.select() as any,
      },
    } satisfies Prisma.ecommerce_mall_wishlist_itemsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallWishlistItem.ISummary> {
    return {
      id: input.id,
      created_at: toISOStringSafe(input.created_at),
      product: await EcommerceMallProductAtSummaryTransformer.transform(
        input.product as any,
      ),
    };
  }
}
