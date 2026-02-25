import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDataSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test comprehensive search functionality for data snapshots.
 * Verify that super administrators can search snapshots with various filters
 * including entity types, specific entity IDs, creation date ranges, creator
 * user filters, and text search on change descriptions. Test the pagination
 * system with different page sizes and verify the response structure contains
 * proper snapshot summaries.
 */
export async function test_api_data_snapshots_search_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate super administrator connection using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Test 1: Empty search (default parameters)
  const emptySearch =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      { body: {} satisfies IEcommerceDataSnapshot.IRequest },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "pagination object exists",
    () => !!emptySearch.pagination,
  );
  TestValidator.predicate("data array exists", () =>
    Array.isArray(emptySearch.data),
  );
  // Test 2: Search with entity type filter
  const entityTypes = [
    "product",
    "variant",
    "seller_profile",
    "order_item",
    "review",
    "cancellation_request",
    "refund_request",
  ] as const;
  const randomEntityType = RandomGenerator.pick(entityTypes);
  const entityTypeSearch =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          entity_type: randomEntityType,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(entityTypeSearch);
  // Test 3: Search with pagination parameters
  const paginationSearch =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: { page: 1, limit: 10 } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(paginationSearch);
  TestValidator.predicate(
    "page number is positive",
    () => paginationSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is within bounds",
    () =>
      paginationSearch.pagination.limit >= 1 &&
      paginationSearch.pagination.limit <= 100,
  );
  // Test 4: Search with date range filters
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateSearch =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          created_at_after: oneWeekAgo.toISOString(),
          created_at_before: now.toISOString(),
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(dateSearch);
  // Test 5: Search with text search on change description
  const textSearch =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          change_description_search: "update",
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(textSearch);
  // Test 6: Search with entity IDs filter
  const entityIdSearch =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          entity_ids: [typia.random<string & tags.Format<"uuid">>()],
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(entityIdSearch);
  // Test 7: Search with combined filters
  const combinedSearch =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          entity_type: "product",
          page: 1,
          limit: 5,
          created_at_after: oneWeekAgo.toISOString(),
          change_description_search: "created",
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test 8: Test different page sizes
  const smallPageSearch =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      { body: { page: 1, limit: 5 } satisfies IEcommerceDataSnapshot.IRequest },
    );
  typia.assert(smallPageSearch);
  TestValidator.equals("small page limit", smallPageSearch.pagination.limit, 5);
  const largePageSearch =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: { page: 1, limit: 50 } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(largePageSearch);
  TestValidator.equals(
    "large page limit",
    largePageSearch.pagination.limit,
    50,
  );
  // Validate snapshot summary structure for returned data
  if (emptySearch.data.length > 0) {
    const snapshot = emptySearch.data[0];
    TestValidator.predicate(
      "snapshot has valid structure",
      () =>
        !!snapshot.id &&
        !!snapshot.entity_type &&
        !!snapshot.entity_id &&
        !!snapshot.change_description &&
        !!snapshot.created_at &&
        !!snapshot.updated_at,
    );
  }
  // Test pagination consistency
  TestValidator.predicate(
    "pagination records consistency",
    () =>
      emptySearch.pagination.records >= 0 &&
      emptySearch.pagination.pages ===
        Math.ceil(
          emptySearch.pagination.records / emptySearch.pagination.limit,
        ),
  );
}
