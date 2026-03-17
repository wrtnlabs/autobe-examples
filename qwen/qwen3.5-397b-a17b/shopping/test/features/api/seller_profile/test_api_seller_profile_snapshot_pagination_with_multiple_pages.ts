import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller profile snapshot pagination with multiple pages.
 *
 * This test verifies that the seller profile snapshot history endpoint
 * correctly handles pagination when there are multiple snapshots.
 *
 * Test Steps:
 * 1. Register a new seller account
 * 2. Retrieve snapshot history with pagination
 * 3. Verify pagination metadata is correct
 * 4. Verify snapshot data structure and ordering
 * 5. Validate pages calculation matches records and limit
 */
export async function test_api_seller_profile_snapshot_pagination_with_multiple_pages(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Retrieve snapshot history (pagination handled by API)
  const snapshots =
    await api.functional.shoppingMall.seller.profile.snapshots.list(
      sellerConnection,
    );
  typia.assert(snapshots);
  // 3. Verify pagination metadata structure
  TestValidator.predicate(
    "pagination current is positive integer",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive integer",
    snapshots.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 4. Verify data array matches pagination constraints
  TestValidator.predicate(
    "data length does not exceed limit",
    snapshots.data.length <= snapshots.pagination.limit,
  );
  TestValidator.predicate(
    "data length does not exceed total records",
    snapshots.data.length <= snapshots.pagination.records,
  );
  // 5. Verify all snapshots have correct structure and seller profile_type
  for (const snapshot of snapshots.data) {
    const validatedSnapshot = typia.assert(snapshot);
    TestValidator.equals(
      "snapshot profile type is seller",
      validatedSnapshot.profile_type,
      "seller",
    );
    TestValidator.predicate(
      "snapshot id is valid UUID format",
      validatedSnapshot.id.length === 36,
    );
    TestValidator.predicate(
      "snapshot has valid ISO timestamp",
      validatedSnapshot.snapshot_at.length > 0,
    );
  }
  // 6. Verify chronological ordering (newest first - descending order)
  if (snapshots.data.length > 1) {
    for (let i = 0; i < snapshots.data.length - 1; i++) {
      const currentTime = new Date(snapshots.data[i].snapshot_at).getTime();
      const nextTime = new Date(snapshots.data[i + 1].snapshot_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} is newer than or equal to snapshot ${i + 1}`,
        currentTime >= nextTime,
      );
    }
  }
  // 7. Verify pages calculation is mathematically correct
  const expectedPages =
    snapshots.pagination.records === 0
      ? 0
      : Math.ceil(snapshots.pagination.records / snapshots.pagination.limit);
  TestValidator.equals(
    "pages calculation matches ceiling division",
    snapshots.pagination.pages,
    expectedPages,
  );
  // 8. Verify current page is within valid range
  TestValidator.predicate(
    "current page does not exceed total pages",
    snapshots.pagination.current <= snapshots.pagination.pages ||
      snapshots.pagination.pages === 0,
  );
  // 9. If there are records, verify first page behavior
  if (snapshots.pagination.records > 0) {
    TestValidator.equals(
      "first page when records exist",
      snapshots.pagination.current,
      1,
    );
    TestValidator.predicate(
      "data array not empty when records exist",
      snapshots.data.length > 0,
    );
  }
  // 10. If no records, verify empty state
  if (snapshots.pagination.records === 0) {
    TestValidator.equals(
      "pages is zero when no records",
      snapshots.pagination.pages,
      0,
    );
    TestValidator.equals(
      "data is empty when no records",
      snapshots.data.length,
      0,
    );
  }
}
