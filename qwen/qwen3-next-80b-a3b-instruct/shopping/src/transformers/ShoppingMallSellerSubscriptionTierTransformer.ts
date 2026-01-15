import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerSubscriptionTier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionTier";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerSubscriptionTierTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_subscription_tiersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        tier_name: true,
        description: true,
        price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_seller_subscription_tiersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerSubscriptionTier> {
    return {
      id: input.id,
      status: input.deleted_at ? "cancelled" : "active",
      start_date: toISOStringSafe(input.created_at),
      end_date: toISOStringSafe(input.updated_at),
      price: Number(input.price),
      currency: input.seller.currency,
    };
  }
}
