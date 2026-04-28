import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test unfiltered snapshot browsing as an authenticated administrator.
 *
 * Validates that an admin can query the snapshot audit trail endpoint without applying any filters,
 * returning a paginated list of all snapshot summaries from the platform's immutable audit trail.
 * The test verifies that the response includes proper pagination metadata and snapshot summary
 * records containing id, entityType, and createdAt fields.
 *
 * No entity type filter, date range, or search term is applied, so snapshots from all supported
 * entity types (product, product_variant, seller_profile, order_item, review,
 * cancellation_request, refund_request) should be eligible for inclusion.
 *
 * 1. Register and authenticate an administrator using the join utility.
 * 2. Query the snapshot audit trail with an empty request body (no filters).
 * 3. Validate the paginated response structure and pagination metadata values.
 */
export async function test_api_admin_snapshots_browsing_unfiltered(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Browse snapshots without any filters
  const snapshots =
    await api.functional.ecommercePlatform.admin.snapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(snapshots);
  // 3. Validate pagination defaults are applied
  TestValidator.predicate(
    "current page is 1",
    snapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit within valid range",
    snapshots.pagination.limit >= 1 && snapshots.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  // 4. Validate snapshot summaries have required fields
  TestValidator.equals(
    "snapshot data is array",
    typeof snapshots.data,
    "object",
  );
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    TestValidator.predicate("snapshot has id", firstSnapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has entityType",
      firstSnapshot.entityType.length > 0,
    );
    TestValidator.predicate(
      "snapshot has createdAt",
      firstSnapshot.createdAt.length > 0,
    );
  }
}
