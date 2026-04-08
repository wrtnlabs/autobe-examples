import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallProductAtSummaryTransformer } from "./ShoppingMallProductAtSummaryTransformer";

export namespace ShoppingMallWishlistItemTransformer {
  export type Payload = Prisma.shopping_mall_wishlist_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: true,
        product: {
          select: {
            id: true,
            name: true,
            base_price: true,
            created_at: true,
            seller: {
              select: {
                id: true,
                email: true,
                password_hash: true,
                approval_status: true,
                rejection_reason: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                sessions: { select: { id: true } },
                passwordResets: { select: { id: true } },
                emailVerifications: { select: { id: true } },
                profile: { select: { id: true } },
                approvalRequests: { select: { id: true } },
                adminPromotionRequests: { select: { id: true } },
                products: { select: { id: true } },
                orderItems: { select: { id: true } },
                shipments: { select: { id: true } },
                cancellationRequests: { select: { id: true } },
                cancellationRequestSnapshots: { select: { id: true } },
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                parent_id: true,
              },
            },
            images: {
              select: {
                url: true,
                display_order: true,
                deleted_at: true,
              },
            },
            variants: {
              select: {
                inventoryRecords: true,
              },
            },
          },
        },
      },
    } satisfies Prisma.shopping_mall_wishlist_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallWishlistItem> {
    return {
      id: input.id,
      product: await ShoppingMallProductAtSummaryTransformer.transform(
        input.product,
      ),
      created_at: toISOStringSafe(input.created_at),
    } satisfies IShoppingMallWishlistItem;
  }
}
