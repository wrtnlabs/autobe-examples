import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_snapshot_fetch_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorized access
  const adminConnection: api.IConnection = { host: connection.host };
  // In simulation mode, generate a random snapshot id to fetch
  // If not in simulation mode, require a valid snapshot id to test
  // Here we attempt fetch with simulation to validate correct behavior
  // Since no creation or utility is provided, rely on simulation
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Fetch seller profile snapshot by id using adminConnection
  const snapshot = await api.functional.shoppingMall.sellerProfileSnapshots.at(
    adminConnection,
    {
      id: snapshotId,
    },
  );
  typia.assert(snapshot);
  // No property-level validation due to properties not existing on the type
}
