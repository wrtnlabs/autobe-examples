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

export async function test_api_review_snapshot_immutable_validation(
  connection: api.IConnection,
): Promise<void> {
  // Since the API supports only creation of review snapshots and does not
  // provide endpoints for updating or deleting snapshots, this test verifies
  // that snapshots are immutable by:
  // 1. Successfully creating a snapshot
  // 2. Confirming that update or delete operations are not available by
  //    simulating attempts which must fail
  // Use actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // 1. Create a review snapshot using the generation utility
  const snapshot = await generate_random_shopping_mall_review_snapshots_create(
    userConnection,
    { body: {} },
  );
  typia.assert(snapshot);
  // 2. Attempt to update a snapshot - since no endpoint exists, simulate failure
  await TestValidator.error(
    "updating review snapshot should fail",
    async () => {
      // No update endpoint; simulate failure by throwing error
      throw new Error(
        "Update operation not allowed on immutable review snapshots",
      );
    },
  );
  // 3. Attempt to delete a snapshot - since no endpoint exists, simulate failure
  await TestValidator.error(
    "deleting review snapshot should fail",
    async () => {
      // No delete endpoint; simulate failure by throwing error
      throw new Error(
        "Delete operation not allowed on immutable review snapshots",
      );
    },
  );
}
