import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_review_snapshots_create } from "../../../generate/generate_random_shopping_mall_review_snapshots_create";
import { prepare_random_shopping_mall_review_snapshot } from "../../../prepare/prepare_random_shopping_mall_review_snapshot";

export async function test_api_review_snapshot_rating_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Use actor-specific connection (assume base connection is just host)
  const userConnection: api.IConnection = { host: connection.host };
  // Create snapshot with minimum allowed rating value
  const minRatingBody: DeepPartial<IShoppingMallReviewSnapshot.ICreate> = {
    rating: 1,
  };
  const minSnapshotBase =
    await generate_random_shopping_mall_review_snapshots_create(
      userConnection,
      { body: minRatingBody },
    );
  typia.assert(minSnapshotBase);
  const minSnapshot = minSnapshotBase as IShoppingMallReviewSnapshot & { rating: number };
  // Validate rating is min 1
  TestValidator.equals("min rating snapshot rating", minSnapshot.rating, 1);
  // Create snapshot with maximum allowed rating value
  const maxRatingBody: DeepPartial<IShoppingMallReviewSnapshot.ICreate> = {
    rating: 5,
  };
  const maxSnapshotBase =
    await generate_random_shopping_mall_review_snapshots_create(
      userConnection,
      { body: maxRatingBody },
    );
  typia.assert(maxSnapshotBase);
  const maxSnapshot = maxSnapshotBase as IShoppingMallReviewSnapshot & { rating: number };
  // Validate rating is max 5
  TestValidator.equals("max rating snapshot rating", maxSnapshot.rating, 5);
  // Validate these two snapshots are different
  TestValidator.notEquals(
    "min and max rating snapshots differ",
    minSnapshot,
    maxSnapshot,
  );
}
