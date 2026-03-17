import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test the popular feed pagination edge cases and boundary conditions.
 *
 * This test validates:
 * 1. High limit (100) - the maximum allowed per IRedditLikePost.IRequest
 * 2. Minimum limit (1) - boundary testing
 * 3. Page navigation (page 2) and data distinctness across pages
 * 4. Pagination pages calculation: ceil(records / limit)
 * 5. Default parameter handling (page defaults to 1, limit defaults to 20)
 */
export async function test_api_guest_feeds_popular_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as guest using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditLikeGuest.IJoin>(),
  });
  // Test 1: Maximum limit (100) - verify boundary acceptance
  const highLimitResponse: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.guest.feeds.popular.index(guestConnection, {
      body: {
        page: 1,
        limit: 100,
        sort: "new",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(highLimitResponse);
  // Validate limit is respected and pages calculation follows formula
  TestValidator.equals(
    "high limit - current page is 1",
    highLimitResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "high limit - limit is 100",
    highLimitResponse.pagination.limit,
    100,
  );
  // If records > 0, pages should be at least 1; otherwise 0
  const expectedPages =
    highLimitResponse.pagination.records > 0
      ? Math.ceil(highLimitResponse.pagination.records / 100)
      : 0;
  TestValidator.equals(
    "high limit - pages calculation",
    highLimitResponse.pagination.pages,
    expectedPages,
  );
  // Data count should not exceed the limit (records may be less than limit on last/first page)
  TestValidator.predicate(
    "data array length <= limit",
    highLimitResponse.data.length <= highLimitResponse.pagination.limit,
  );
  // Test 2: Minimum limit (1) - boundary testing
  const minLimitResponse: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.guest.feeds.popular.index(guestConnection, {
      body: {
        page: 1,
        limit: 1,
        sort: "new",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(minLimitResponse);
  TestValidator.equals(
    "min limit - limit is 1",
    minLimitResponse.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "data array length <= 1",
    minLimitResponse.data.length <= 1,
  );
  // Test 3: Page 2 navigation - validates pagination cursor/offset works correctly
  // Use larger dataset for page navigation testing
  const page2Response: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.guest.feeds.popular.index(guestConnection, {
      body: {
        page: 2,
        limit: 20,
        sort: "new",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(page2Response);
  // Page 2 should report current page as 2
  TestValidator.equals(
    "page 2 - current page",
    page2Response.pagination.current,
    2,
  );
  // Records should be consistent across pages (same filter criteria)
  TestValidator.equals(
    "records consistency across pages",
    page2Response.pagination.records,
    highLimitResponse.pagination.records,
  );
  // If both pages have data, they should return different records
  if (page2Response.data.length > 0 && highLimitResponse.data.length > 0) {
    TestValidator.notEquals(
      "page 2 first item differs from page 1 first item",
      page2Response.data[0]!.id,
      highLimitResponse.data[0]!.id,
    );
  }
  // Test 4: Default parameters - verify defaults (page=1, limit=20)
  const defaultResponse: IPageIRedditLikePost.ISummary =
    await api.functional.redditLike.guest.feeds.popular.index(guestConnection, {
      body: {
        sort: "hot",
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(defaultResponse);
  // Default page should be 1
  TestValidator.equals(
    "default - current is 1",
    defaultResponse.pagination.current,
    1,
  );
  // Default limit should be 20 (per IRedditLikePost.IRequest default)
  TestValidator.equals(
    "default - limit is 20",
    defaultResponse.pagination.limit,
    20,
  );
  // Test 5: Verify edge case where page > pages returns empty data
  if (highLimitResponse.pagination.pages > 0) {
    const beyondLastPage: IPageIRedditLikePost.ISummary =
      await api.functional.redditLike.guest.feeds.popular.index(
        guestConnection,
        {
          body: {
            page: highLimitResponse.pagination.pages + 1000,
            limit: 20,
            sort: "new",
          } satisfies IRedditLikePost.IRequest,
        },
      );
    typia.assert(beyondLastPage);
    // Beyond last page should have predictable pagination metadata
    TestValidator.equals(
      "beyond pages - current matches requested",
      beyondLastPage.pagination.current,
      highLimitResponse.pagination.pages + 1000,
    );
    // Data should be empty when requested page exceeds available pages
    TestValidator.predicate(
      "beyond last page has empty data",
      beyondLastPage.data.length === 0,
    );
  }
}
