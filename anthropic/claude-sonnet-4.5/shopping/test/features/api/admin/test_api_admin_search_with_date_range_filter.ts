import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin search with creation date range filtering.
 *
 * This test validates the temporal filtering capabilities of the admin search
 * API by creating multiple admin accounts and then querying them using date
 * range filters.
 *
 * Test Process:
 *
 * 1. Create an authenticated admin account for performing search operations
 * 2. Create multiple test admin accounts to establish a dataset with varied
 *    creation times
 * 3. Execute search queries with different date range combinations:
 *
 *    - Bounded range (both created_after and created_before)
 *    - Open-ended future range (only created_after)
 *    - Open-ended past range (only created_before)
 * 4. Verify that only admins within the specified time windows are returned
 * 5. Validate response structure and pagination metadata
 */
export async function test_api_admin_search_with_date_range_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as primary admin for search operations
  const primaryAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(primaryAdmin);

  // Step 2: Create multiple test admin accounts with slight delays to ensure different timestamps
  const testAdmins: IShoppingMallAdmin.IAuthorized[] = [];

  for (let i = 0; i < 5; i++) {
    const admin = await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: RandomGenerator.pick([
          "super_admin",
          "moderator",
          "support",
        ] as const),
        email_verified: typia.random<boolean>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
    typia.assert(admin);
    testAdmins.push(admin);

    // Small delay to ensure different creation timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 3: Test Scenario A - Bounded date range (both created_after and created_before)
  const middleAdmin = testAdmins[2];
  const middleTimestamp = middleAdmin.created_at;
  const beforeMiddle = new Date(
    new Date(middleTimestamp).getTime() - 5000,
  ).toISOString();
  const afterMiddle = new Date(
    new Date(middleTimestamp).getTime() + 5000,
  ).toISOString();

  const boundedRangeResult =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        created_after: beforeMiddle,
        created_before: afterMiddle,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(boundedRangeResult);

  // Validate that all returned admins fall within the specified date range
  for (const admin of boundedRangeResult.data) {
    const createdAt = new Date(admin.created_at);
    const afterDate = new Date(beforeMiddle);
    const beforeDate = new Date(afterMiddle);

    TestValidator.predicate(
      "admin created_at should be after created_after filter",
      createdAt >= afterDate,
    );
    TestValidator.predicate(
      "admin created_at should be before created_before filter",
      createdAt <= beforeDate,
    );
  }

  // Step 4: Test Scenario B - Open-ended future range (only created_after)
  const firstAdmin = testAdmins[0];
  const afterTimestamp = firstAdmin.created_at;

  const futureRangeResult =
    await api.functional.shoppingMall.admin.admins.index(connection, {
      body: {
        created_after: afterTimestamp,
      } satisfies IShoppingMallAdmin.IRequest,
    });
  typia.assert(futureRangeResult);

  // Validate that all returned admins were created after the specified timestamp
  for (const admin of futureRangeResult.data) {
    const createdAt = new Date(admin.created_at);
    const afterDate = new Date(afterTimestamp);

    TestValidator.predicate(
      "admin created_at should be after created_after filter in open-ended range",
      createdAt >= afterDate,
    );
  }

  // Step 5: Test Scenario C - Open-ended past range (only created_before)
  const lastAdmin = testAdmins[testAdmins.length - 1];
  const beforeTimestamp = lastAdmin.created_at;

  const pastRangeResult = await api.functional.shoppingMall.admin.admins.index(
    connection,
    {
      body: {
        created_before: beforeTimestamp,
      } satisfies IShoppingMallAdmin.IRequest,
    },
  );
  typia.assert(pastRangeResult);

  // Validate that all returned admins were created before the specified timestamp
  for (const admin of pastRangeResult.data) {
    const createdAt = new Date(admin.created_at);
    const beforeDate = new Date(beforeTimestamp);

    TestValidator.predicate(
      "admin created_at should be before created_before filter in open-ended range",
      createdAt <= beforeDate,
    );
  }

  // Step 6: Validate pagination structure in all responses
  TestValidator.predicate(
    "bounded range result has valid pagination",
    boundedRangeResult.pagination.current >= 0 &&
      boundedRangeResult.pagination.limit > 0 &&
      boundedRangeResult.pagination.records >= 0 &&
      boundedRangeResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "future range result has valid pagination",
    futureRangeResult.pagination.current >= 0 &&
      futureRangeResult.pagination.limit > 0 &&
      futureRangeResult.pagination.records >= 0 &&
      futureRangeResult.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "past range result has valid pagination",
    pastRangeResult.pagination.current >= 0 &&
      pastRangeResult.pagination.limit > 0 &&
      pastRangeResult.pagination.records >= 0 &&
      pastRangeResult.pagination.pages >= 0,
  );
}
