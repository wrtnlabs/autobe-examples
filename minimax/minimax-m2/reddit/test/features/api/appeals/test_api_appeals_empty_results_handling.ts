import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

/**
 * Test appeals search behavior when no appeals match the specified criteria.
 * Validate proper handling of empty result sets with appropriate pagination
 * metadata showing zero records. Test various filter combinations that would
 * result in no matches to ensure graceful empty state handling.
 */
export async function test_api_appeals_empty_results_handling(
  connection: api.IConnection,
) {
  // Step 1: Create registered user for authentication
  const userEmail = typia.random<string & tags.Format<"email">>();
  const user = await api.functional.auth.registeredUser.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      email: userEmail,
      password: "testpassword123",
      href: "https://example.com/test",
      referrer: "https://google.com",
    } satisfies IRedditPlatformRegisteredUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Test appeals search with filters that return no results
  // Test various filter combinations that would result in empty results
  const emptyResultTests = [
    // Test with non-existent status
    {
      name: "non-existent status filter",
      filters: {
        status: "non_existent_status",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformModerationAppeal.IRequest,
    },
    // Test with non-existent appeal level
    {
      name: "non-existent appeal level filter",
      filters: {
        appeal_level: "invalid_level",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformModerationAppeal.IRequest,
    },
    // Test with specific date range that should have no appeals
    {
      name: "future date range filter",
      filters: {
        created_at_from: "2030-01-01T00:00:00.000Z",
        created_at_to: "2030-12-31T23:59:59.999Z",
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformModerationAppeal.IRequest,
    },
    // Test with combination of filters that won't match
    {
      name: "combined impossible filters",
      filters: {
        status: "pending",
        appeal_level: "final",
        is_escalated: true,
        page: 1,
        limit: 20,
      } satisfies IRedditPlatformModerationAppeal.IRequest,
    },
    // Test with pagination on empty dataset
    {
      name: "pagination on empty results",
      filters: {
        page: 999,
        limit: 20,
      } satisfies IRedditPlatformModerationAppeal.IRequest,
    },
  ];

  // Execute each test case
  for (const testCase of emptyResultTests) {
    const result =
      await api.functional.redditPlatform.registeredUser.appeals.index(
        connection,
        {
          body: testCase.filters,
        },
      );
    typia.assert(result);

    // Validate empty result handling
    TestValidator.equals(
      `${testCase.name} should return empty data array`,
      result.data,
      [],
    );

    // Validate pagination metadata
    TestValidator.equals(
      `${testCase.name} should have zero total records`,
      result.pagination.records,
      0,
    );

    TestValidator.equals(
      `${testCase.name} should have zero pages`,
      result.pagination.pages,
      0,
    );

    TestValidator.equals(
      `${testCase.name} should preserve requested limit`,
      result.pagination.limit,
      testCase.filters.limit ?? 20,
    );

    TestValidator.equals(
      `${testCase.name} should preserve requested page`,
      result.pagination.current,
      testCase.filters.page ?? 1,
    );
  }

  // Step 3: Test edge case - very large page number
  const largePageResult =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 10000,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(largePageResult);

  TestValidator.equals(
    "large page number should return empty results",
    largePageResult.data,
    [],
  );

  TestValidator.equals(
    "large page should have zero records",
    largePageResult.pagination.records,
    0,
  );

  // Step 4: Test with different limit values on empty dataset
  const limitTests = [1, 10, 50, 100];
  for (const limit of limitTests) {
    const limitResult =
      await api.functional.redditPlatform.registeredUser.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(limitResult);

    TestValidator.equals(
      `empty results with limit ${limit} should have zero records`,
      limitResult.pagination.records,
      0,
    );

    TestValidator.equals(
      `empty results should preserve limit ${limit}`,
      limitResult.pagination.limit,
      limit,
    );
  }
}
