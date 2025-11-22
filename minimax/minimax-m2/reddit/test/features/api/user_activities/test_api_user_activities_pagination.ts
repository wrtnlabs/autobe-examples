import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUserActivity";
import type { IRedditPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserActivity";

/**
 * Test pagination functionality for user activities endpoint.
 *
 * Validates comprehensive pagination behavior including:
 *
 * - Different page numbers and limit constraints (1-100)
 * - Proper pagination metadata accuracy
 * - Edge cases like zero limits, excessive limits, and non-existent pages
 * - Data consistency across paginated responses
 *
 * Tests the PATCH /redditPlatform/users/{userId}/activities endpoint with
 * various pagination parameters to ensure robust pagination functionality for
 * user activity analytics and monitoring.
 */
export async function test_api_user_activities_pagination(
  connection: api.IConnection,
) {
  // Generate test user ID
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // First, create some activities by simulating user actions
  // Since we can't directly create activities, we'll test with the endpoint's
  // built-in data generation and focus on pagination structure validation

  // Test 1: Default pagination (page 1, default limit 20)
  const defaultPage =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {} satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    defaultPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records should be consistent",
    defaultPage.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages should be calculated correctly",
    Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
    defaultPage.pagination.pages,
  );
  TestValidator.equals(
    "first page data count should match limit",
    defaultPage.data.length <= defaultPage.pagination.limit,
    true,
  );

  // Test 2: Explicit page 1 with default limit
  const page1Explicit =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        page: 1,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(page1Explicit);
  TestValidator.equals(
    "explicit page 1 should have correct page number",
    page1Explicit.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit page 1 should have default limit",
    page1Explicit.pagination.limit,
    20,
  );

  // Test 3: Page 2 with default limit
  const page2 = await api.functional.redditPlatform.users.activities.index(
    connection,
    {
      userId,
      body: {
        page: 2,
      } satisfies IRedditPlatformUserActivity.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page 2 should have correct page number",
    page2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 should have default limit",
    page2.pagination.limit,
    20,
  );

  // Test 4: Custom limit (10 items per page)
  const customLimit =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(customLimit);
  TestValidator.equals(
    "custom limit should be 10",
    customLimit.pagination.limit,
    10,
  );
  TestValidator.equals(
    "custom limit page 1 data count should not exceed limit",
    customLimit.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "custom limit should have correct pages calculation",
    Math.ceil(customLimit.pagination.records / 10),
    customLimit.pagination.pages,
  );

  // Test 5: Maximum limit (100 items per page)
  const maxLimit = await api.functional.redditPlatform.users.activities.index(
    connection,
    {
      userId,
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditPlatformUserActivity.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals(
    "max limit should be 100",
    maxLimit.pagination.limit,
    100,
  );
  TestValidator.equals(
    "max limit data count should not exceed limit",
    maxLimit.data.length <= 100,
    true,
  );

  // Test 6: Minimum limit (1 item per page)
  const minLimit = await api.functional.redditPlatform.users.activities.index(
    connection,
    {
      userId,
      body: {
        page: 1,
        limit: 1,
      } satisfies IRedditPlatformUserActivity.IRequest,
    },
  );
  typia.assert(minLimit);
  TestValidator.equals("min limit should be 1", minLimit.pagination.limit, 1);
  TestValidator.equals(
    "min limit should have at most 1 item",
    minLimit.data.length <= 1,
    true,
  );

  // Test 7: Edge case - requesting non-existent page (page 99)
  const nonExistentPage =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        page: 99,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(nonExistentPage);
  TestValidator.equals(
    "non-existent page should return empty data",
    nonExistentPage.data.length === 0,
    true,
  );
  TestValidator.equals(
    "non-existent page should maintain pagination structure",
    nonExistentPage.pagination.current === 99,
    true,
  );

  // Test 8: Custom limit with page 2
  const customLimitPage2 =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        page: 2,
        limit: 25,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(customLimitPage2);
  TestValidator.equals(
    "custom limit page 2 should have correct page number",
    customLimitPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "custom limit page 2 should not exceed limit",
    customLimitPage2.data.length <= 25,
    true,
  );

  // Test 9: Boundary test - limit at maximum constraint
  const boundaryMax =
    await api.functional.redditPlatform.users.activities.index(connection, {
      userId,
      body: {
        limit: 100,
      } satisfies IRedditPlatformUserActivity.IRequest,
    });
  typia.assert(boundaryMax);
  TestValidator.equals(
    "boundary max limit should be 100",
    boundaryMax.pagination.limit,
    100,
  );

  // Test 10: Verify pagination metadata consistency across requests
  const page1Data = await api.functional.redditPlatform.users.activities.index(
    connection,
    {
      userId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    },
  );
  typia.assert(page1Data);

  const page2Data = await api.functional.redditPlatform.users.activities.index(
    connection,
    {
      userId,
      body: {
        page: 2,
        limit: 10,
      } satisfies IRedditPlatformUserActivity.IRequest,
    },
  );
  typia.assert(page2Data);

  TestValidator.equals(
    "all requests should report same total records",
    page1Data.pagination.records === page2Data.pagination.records,
    true,
  );
  TestValidator.equals(
    "pagination structure should be consistent",
    page1Data.pagination.records >= 0 && page2Data.pagination.records >= 0,
    true,
  );

  // Test 11: Validate limit constraint enforcement
  const overLimit = await api.functional.redditPlatform.users.activities.index(
    connection,
    {
      userId,
      body: {
        limit: 150, // Exceeds maximum of 100
      } satisfies IRedditPlatformUserActivity.IRequest,
    },
  );
  typia.assert(overLimit);
  TestValidator.equals(
    "excessive limit should be constrained to maximum",
    overLimit.pagination.limit <= 100,
    true,
  );

  // Test 12: Validate minimum page number
  const zeroPage = await api.functional.redditPlatform.users.activities.index(
    connection,
    {
      userId,
      body: {
        page: 0, // Below minimum of 1
      } satisfies IRedditPlatformUserActivity.IRequest,
    },
  );
  typia.assert(zeroPage);
  TestValidator.equals(
    "zero page should be handled gracefully",
    zeroPage.pagination.current >= 1,
    true,
  );

  // Test 13: Verify data structure integrity
  TestValidator.equals(
    "response should have pagination metadata",
    defaultPage.pagination !== undefined &&
      typeof defaultPage.pagination.current === "number" &&
      typeof defaultPage.pagination.limit === "number" &&
      typeof defaultPage.pagination.records === "number" &&
      typeof defaultPage.pagination.pages === "number",
    true,
  );

  TestValidator.equals(
    "response should have data array",
    Array.isArray(defaultPage.data),
    true,
  );

  // Test 14: Validate activity data structure
  if (defaultPage.data.length > 0) {
    const firstActivity = defaultPage.data[0];
    TestValidator.equals(
      "activity should have required fields",
      firstActivity.id !== undefined &&
        firstActivity.activity_type !== undefined &&
        firstActivity.activity_description !== undefined &&
        firstActivity.created_at !== undefined,
      true,
    );
  }
}
