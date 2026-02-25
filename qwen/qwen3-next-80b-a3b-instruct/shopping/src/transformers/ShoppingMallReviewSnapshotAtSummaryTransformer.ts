import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_review_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        rating: true,
        content: true,
        is_deleted: true,
        changed_at: true,
        changed_by: true,
        previous_rating: true,
        previous_content: true,
        previous_is_deleted: true,
        review: true,
      },
    } satisfies Prisma.shopping_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewSnapshot.ISummary> {
    return {
      rating: input.rating,
      content: input.content ?? undefined,
      is_deleted: input.is_deleted,
      changed_at: toISOStringSafe(input.changed_at),
      changed_by: input.changed_by satisfies string as "customer" | "admin",
      previous_rating: input.previous_rating ?? undefined,
      previous_content: input.previous_content ?? undefined,
      previous_is_deleted: input.previous_is_deleted ?? undefined,
    };
  }
}
