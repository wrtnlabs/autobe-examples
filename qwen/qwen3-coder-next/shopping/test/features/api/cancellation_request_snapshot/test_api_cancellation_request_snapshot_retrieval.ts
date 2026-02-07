import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_cancellation_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for snapshot creation and retrieval
  const adminConnection: api.IConnection = { host: connection.host };
  // Test: Retrieve a cancellation request snapshot by ID
  const snapshot =
    await api.functional.shoppingMall.cancellation_request_snapshots.at(
      adminConnection,
      {
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
}
