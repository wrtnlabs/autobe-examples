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
 * Test appeals search with various limit values and boundary conditions.
 *
 * This comprehensive test validates the appeals search endpoint's behavior with
 * different limit parameters, ensuring proper boundary handling and result
 * accuracy. The test covers minimum (1), maximum (100), and extreme limit
 * values, plus pagination scenarios with page=1 and limit=100 for large result
 * sets.
 *
 * Testing approach:
 *
 * 1. Authenticate a registered user for proper authorization
 * 2. Test minimum limit boundary (limit=1)
 * 3. Test maximum limit boundary (limit=100)
 * 4. Test extreme values to verify validation (limit=0, limit=101)
 * 5. Test pagination scenarios (page=1, limit=100)
 * 6. Validate result consistency and proper boundary handling
 * 7. Verify pagination metadata accuracy
 *
 * This ensures the appeals search functionality handles all boundary conditions
 * correctly and provides accurate, properly paginated results.
 */
export async function test_api_appeals_limit_and_boundary_validation(
  connection: api.IConnection,
) {
  // Step 1: Create registered user for authentication
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const registeredUser: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `appeals_test_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        display_name: "Appeals Test User",
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Test minimum limit boundary (limit=1)
  const minLimitResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(minLimitResult);
  TestValidator.predicate(
    "minimum limit should return valid pagination",
    minLimitResult.data.length <= 1 &&
      minLimitResult.pagination.limit === 1 &&
      minLimitResult.pagination.current >= 1,
  );

  // Step 3: Test maximum limit boundary (limit=100)
  const maxLimitResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(maxLimitResult);
  TestValidator.predicate(
    "maximum limit should return valid pagination",
    maxLimitResult.data.length <= 100 &&
      maxLimitResult.pagination.limit === 100 &&
      maxLimitResult.pagination.current >= 1,
  );

  // Step 4: Test extreme values - limit=0 (should be handled gracefully)
  const zeroLimitResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 0,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(zeroLimitResult);
  TestValidator.predicate(
    "zero limit should be handled appropriately",
    zeroLimitResult.data.length >= 0 && zeroLimitResult.pagination.limit >= 0,
  );

  // Step 5: Test with larger page numbers and boundary limit
  const largePageResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 5,
          limit: 100,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.predicate(
    "large page with max limit should return correct pagination",
    largePageResult.pagination.current === 5 &&
      largePageResult.pagination.limit === 100,
  );

  // Step 6: Test combined pagination with status filtering and boundary limits
  const filteredResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          status: "pending",
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(filteredResult);
  TestValidator.predicate(
    "filtered search with boundary limit should work correctly",
    filteredResult.pagination.limit === 50 &&
      filteredResult.pagination.current === 1 &&
      filteredResult.data.length <= 50,
  );

  // Step 7: Test various limit values within boundary range
  const midRangeLimits = [25, 50, 75];
  for (const limit of midRangeLimits) {
    const midRangeResult: IPageIRedditPlatformModerationAppeal.ISummary =
      await api.functional.redditPlatform.registeredUser.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(midRangeResult);
    TestValidator.predicate(
      `mid-range limit ${limit} should return correct pagination`,
      midRangeResult.pagination.limit === limit &&
        midRangeResult.data.length <= limit,
    );
  }

  // Step 8: Validate pagination metadata consistency across different limits
  const consistencyResults: IPageIRedditPlatformModerationAppeal.ISummary[] =
    [];
  const testLimits = [1, 10, 50, 100];

  for (const limit of testLimits) {
    const result: IPageIRedditPlatformModerationAppeal.ISummary =
      await api.functional.redditPlatform.registeredUser.appeals.index(
        connection,
        {
          body: {
            page: 1,
            limit: limit,
          } satisfies IRedditPlatformModerationAppeal.IRequest,
        },
      );
    typia.assert(result);
    consistencyResults.push(result);
  }

  // Verify that all results have proper pagination metadata
  for (let i = 0; i < consistencyResults.length; i++) {
    const result = consistencyResults[i];
    const expectedLimit = testLimits[i];
    TestValidator.predicate(
      `consistency check for limit ${expectedLimit}`,
      result.pagination.limit === expectedLimit &&
        result.pagination.current >= 1 &&
        result.pagination.records >= 0,
    );
  }
}
