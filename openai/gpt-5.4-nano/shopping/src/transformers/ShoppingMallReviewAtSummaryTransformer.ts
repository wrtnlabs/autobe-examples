import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_reviewsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_product_id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_customer_id: true,
        rating: true,
        body: true,
        is_public: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_reviewsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReview.ISummary> {
    return {
      id: input.id,
      shoppingMallProductId: input.shopping_mall_product_id,
      shoppingMallOrderItemId: input.shopping_mall_order_item_id,
      shoppingMallCustomerId: input.shopping_mall_customer_id,
      rating: input.rating,
      body: input.body ?? null,
      isPublic: input.is_public,
      deletedAt: input.deleted_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
