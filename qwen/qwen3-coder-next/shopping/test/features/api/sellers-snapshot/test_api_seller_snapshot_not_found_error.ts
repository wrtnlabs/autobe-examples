import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellersSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellersSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_snapshot_not_found_error(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random non-existent snapshot ID (valid UUID format but doesn't exist in database)
  const nonExistentSnapshotId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve a non-existent seller snapshot
  await TestValidator.error(
    "should throw 404 for non-existent snapshot",
    async () => {
      await api.functional.shoppingMall.sellers_snapshots.at(connection, {
        snapshotId: nonExistentSnapshotId,
      });
    },
  );
}
