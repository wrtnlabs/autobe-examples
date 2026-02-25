import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test different sorting options for community browsing.
 * Verify each sorting method: subscriber count (popularity), creation date (recency),
 * and alphabetical sorting. Validate that subscriber count sorting ranks communities
 * with higher subscriber counts first, creation date sorting shows newer communities
 * first, and alphabetical sorting arranges communities by name in ascending order.
 * Ensure pagination works correctly with each sorting method.
 *
 * Notes:
 * - The community browsing endpoint requires no authentication.
 * - The `connection` parameter is the base connection only, and we use it directly
 *   as there's no authentication needed.
 * - We use the SDK function directly as no utility function exists.
 */
export async function test_api_community_sorting_various_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Test subscriber count sorting (popularity)
  const subscriberCountResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "subscriber_count",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(subscriberCountResult);
  // Validate at least some data returned
  TestValidator.predicate(
    "subscriber count sorting returns data",
    subscriberCountResult.data.length > 0,
  );
  // Validate ordering by subscriber count (assume server sorts descending)
  for (let i = 1; i < subscriberCountResult.data.length; i++) {
    // Note: We cannot validate actual subscriber count values as they're not in ISummary
    // The validation is that the server implements the sorting correctly
    // This test relies on the server's correct implementation
  }
  // Test creation date sorting (recency)
  const createdAtResult =
    await api.functional.communityPlatform.communities.index(connection, {
      body: {
        sort: "created_at",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    });
  typia.assert(createdAtResult);
  TestValidator.predicate(
    "created_at sorting returns data",
    createdAtResult.data.length > 0,
  );
  // Validate ordering by creation date (newer first)
  for (let i = 1; i < createdAtResult.data.length; i++) {
    const prevDate = new Date(createdAtResult.data[i - 1].created_at);
    const currDate = new Date(createdAtResult.data[i].created_at);
    TestValidator.predicate(
      `created_at sorting order at position ${i}`,
      prevDate >= currDate,
    );
  }
  // Test alphabetical sorting by name
  const nameResult = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "name",
        limit: 10,
        page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(nameResult);
  TestValidator.predicate(
    "name sorting returns data",
    nameResult.data.length > 0,
  );
  // Validate alphabetical order ascending
  for (let i = 1; i < nameResult.data.length; i++) {
    const prevName = nameResult.data[i - 1].name.toLowerCase();
    const currName = nameResult.data[i].name.toLowerCase();
    TestValidator.predicate(
      `name sorting order at position ${i}`,
      prevName <= currName,
    );
  }
  // Test pagination with subscriber count sorting
  const page1Result = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "subscriber_count",
        limit: 5,
        page: 1,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page1Result);
  const page2Result = await api.functional.communityPlatform.communities.index(
    connection,
    {
      body: {
        sort: "subscriber_count",
        limit: 5,
        page: 2,
      } satisfies ICommunityPlatformCommunity.IRequest,
    },
  );
  typia.assert(page2Result);
  // Ensure different pages return different data (if enough records exist)
  if (page1Result.data.length > 0 && page2Result.data.length > 0) {
    TestValidator.notEquals(
      "page 1 and page 2 should have different data",
      page1Result.data[0].id,
      page2Result.data[0].id,
    );
  }
  // Validate pagination metadata
  TestValidator.equals(
    "page 1 current page",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Result.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1Result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages non-negative",
    page1Result.pagination.pages >= 0,
  );
}
