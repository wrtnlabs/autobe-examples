import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test unauthorized access scenarios for fetching seller profile snapshots.
 *
 * This test validates that users who are neither administrators nor the
 * corresponding seller cannot access seller profile snapshots.
 *
 * Steps:
 * 1) Attempt to fetch a seller profile snapshot by ID using unauthorized
 *    actor connections.
 * 2) Confirm that access is denied with HTTP 403 Forbidden.
 */
export async function test_api_seller_profile_snapshot_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Use a random UUID snapshot ID (assuming it exists for the test purpose)
  const snapshotId = typia.random<string & typia.tags.Format<"uuid">>();
  // Create unauthorized user connection
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Access by unauthorized user - expect HTTP 403
  await TestValidator.httpError(
    "fetch snapshot as unauthorized user should fail with 403",
    403,
    async () => {
      await api.functional.shoppingMall.sellerProfileSnapshots.at(
        unauthorizedConnection,
        {
          id: snapshotId,
        },
      );
    },
  );
  // Access anonymously with base connection - expect HTTP 403
  await TestValidator.httpError(
    "fetch snapshot anonymously should fail with 403",
    403,
    async () => {
      await api.functional.shoppingMall.sellerProfileSnapshots.at(connection, {
        id: snapshotId,
      });
    },
  );
}
