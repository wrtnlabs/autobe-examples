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
        previous_rating: true,
        new_rating: true,
        previous_content: true,
        new_content: true,
        created_at: true,
      },
    } satisfies Prisma.shopping_mall_review_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewSnapshot.ISummary> {
    return {
      id: input.id,
      previousRating: input.previous_rating,
      newRating: input.new_rating,
      previousContent: input.previous_content,
      newContent: input.new_content,
      createdAt: input.created_at.toISOString(),
    };
  }
}
