import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import type { IShoppingMallWishlistItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_snapshot_retrieve_by_customer(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test wishlist snapshot retrieval by customer.
   * Validates that authenticated customers can retrieve their own wishlist item snapshots,
   * with proper ownership validation and complete snapshot data verification.
   */
  // 1. Customer authentication setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Generate valid snapshot ID for testing
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test successful retrieval (in simulation mode, returns mock data)
  const snapshot =
    await api.functional.shoppingMall.customer.wishlist.snapshots.at(
      customerConnection,
      { snapshotId },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure - typia.assert already validates types
  TestValidator.equals("snapshot ID matches request", snapshot.id, snapshotId);
  TestValidator.predicate(
    "snapshot data is non-empty string",
    snapshot.snapshotData.length > 0,
  );
  // 5. Verify snapshotData is valid JSON and contains expected fields
  let parsedSnapshotData: Record<string, unknown>;
  try {
    parsedSnapshotData = JSON.parse(snapshot.snapshotData);
  } catch (error) {
    throw new Error(`Invalid JSON in snapshotData: ${error}`);
  }
  TestValidator.predicate(
    "snapshot data contains customer_id",
    "customer_id" in parsedSnapshotData &&
      parsedSnapshotData.customer_id !== undefined,
  );
  TestValidator.predicate(
    "snapshot data contains product_id",
    "product_id" in parsedSnapshotData &&
      parsedSnapshotData.product_id !== undefined,
  );
  TestValidator.predicate(
    "snapshot data contains created_at",
    "created_at" in parsedSnapshotData &&
      parsedSnapshotData.created_at !== undefined,
  );
  // 6. Test 404 error for non-existent snapshot
  const nonExistentSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "returns 404 for non-existent snapshot",
    404,
    async () =>
      await api.functional.shoppingMall.customer.wishlist.snapshots.at(
        customerConnection,
        { snapshotId: nonExistentSnapshotId },
      ),
  );
  // 7. Test 403 error for unauthorized access (another customer's snapshot)
  const otherCustomerConnection: api.IConnection = { host: connection.host };
  const otherCustomer = await authorize_customer_join(otherCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(otherCustomer);
  await TestValidator.httpError(
    "returns 403 for accessing another customer's snapshot",
    403,
    async () =>
      await api.functional.shoppingMall.customer.wishlist.snapshots.at(
        otherCustomerConnection,
        { snapshotId },
      ),
  );
}
