import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test pagination functionality for rate limiting configuration searches.
 * An administrator tests different page sizes, navigates through multiple pages
 * of results, and validates pagination metadata including current page, limit,
 * total records, and total pages. Verify that the pagination controls work
 * correctly with various result set sizes, including empty pages, single-page
 * results, and multi-page result sets. Test boundary conditions like requesting
 * pages beyond the available range.
 */
export async function test_api_rate_limits_search_pagination_controls(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Default pagination (page=1, limit=20)
  const defaultPage =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination structure exists",
    typeof defaultPage.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is non-negative",
    defaultPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is between 1-100",
    defaultPage.pagination.limit >= 1 && defaultPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // Test 2: Small page size (limit=5)
  const smallPage =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(smallPage);
  TestValidator.equals("small page limit is 5", smallPage.pagination.limit, 5);
  TestValidator.predicate(
    "small page data length <= limit",
    smallPage.data.length <= 5,
  );
  // Test 3: Large page size (limit=100)
  const largePage =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.equals(
    "large page limit is 100",
    largePage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large page data length <= limit",
    largePage.data.length <= 100,
  );
  // Test 4: Very high page number (beyond available pages)
  const highPageNumber = defaultPage.pagination.pages + 10;
  const highPage =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          page: highPageNumber,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(highPage);
  // When requesting page beyond total pages, should return empty data array
  TestValidator.equals("high page returns empty data", highPage.data.length, 0);
  TestValidator.predicate(
    "high page current should be adjusted",
    highPage.pagination.current <= highPage.pagination.pages,
  );
  // Test 5: Verify pagination calculations
  const testPage =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(testPage);
  // Validate pagination calculations
  const expectedPages = Math.ceil(
    testPage.pagination.records / testPage.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    testPage.pagination.pages,
    expectedPages,
  );
  // Test 6: Different page numbers within valid range
  if (testPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.discussionBoard.admin.api_rate_limits.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 25,
          } satisfies IDiscussionBoardApiRateLimit.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number is 2",
      secondPage.pagination.current,
      2,
    );
    TestValidator.notEquals(
      "different pages have different data",
      testPage.data,
      secondPage.data,
    );
  }
  // Test 7: Empty result set with filtering
  const emptyFilter =
    await api.functional.discussionBoard.admin.api_rate_limits.index(
      adminConnection,
      {
        body: {
          endpoint_path: "nonexistent-endpoint-that-should-not-match-anything",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardApiRateLimit.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals(
    "empty filter returns empty data",
    emptyFilter.data.length,
    0,
  );
  TestValidator.equals(
    "empty filter records is 0",
    emptyFilter.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty filter pages is 0",
    emptyFilter.pagination.pages,
    0,
  );
}
