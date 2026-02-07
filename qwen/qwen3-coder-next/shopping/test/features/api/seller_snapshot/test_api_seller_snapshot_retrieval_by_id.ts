import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellersSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellersSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of a seller profile snapshot by its unique identifier.
 * This scenario validates that the endpoint correctly fetches seller profile snapshots
 * with all relevant fields including shop name, description, logo reference, and
 * associated seller information.
 */
export async function test_api_seller_snapshot_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random snapshot ID for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the seller snapshot
  const snapshot = await api.functional.shoppingMall.sellers_snapshots.at(
    connection,
    {
      snapshotId,
    },
  );
  // Validate the response structure
  typia.assert(snapshot);
  // Validate that the snapshot exists
  TestValidator.predicate(
    "snapshot exists",
    snapshot !== null && snapshot !== undefined,
  );
}
