import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshotsIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshotsIndex";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallReviewSnapshotsIndexAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_review_snapshots_indicesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_snapshot_id: true,
        review_id: true,
        action_type: true,
        snapshot_sequence: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_review_snapshots_indicesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallReviewSnapshotsIndex.ISummary> {
    return {
      id: input.id,
      shoppingMallSnapshotId: input.shopping_mall_snapshot_id,
      reviewId: input.review_id,
      actionType: input.action_type,
      snapshotSequence: input.snapshot_sequence,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
