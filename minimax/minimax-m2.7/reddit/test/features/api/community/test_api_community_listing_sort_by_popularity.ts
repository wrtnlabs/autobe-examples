import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_listing_sort_by_popularity(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving communities sorted by subscriber count in descending order
  // to show most popular communities first.
  //
  // Steps:
  // 1. Send PATCH request to /redditClone/communities with sortBy set to 'subscriberCount'
  // 2. Verify response returns communities sorted by subscriber_count in descending order
  // 3. Verify pagination metadata is correct
  // 4. Test pagination by requesting limit of 2 with page 1
  // 5. Verify only 2 communities are returned per page
  // 6. Verify pages metadata reflects total available communities
  // Step 1: Retrieve communities sorted by subscriber count (descending)
  const response = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        sortBy: "subscriberCount",
        page: 1,
        limit: 100,
      } satisfies IRedditCloneCommunityBan.IRequest,
    },
  );
  typia.assert(response);
  // Step 2: Verify response structure
  TestValidator.equals("has data array", Array.isArray(response.data), true);
  TestValidator.predicate(
    "has pagination metadata",
    response.pagination !== null,
  );
  // Step 3: Verify pagination metadata is correct
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is 100", response.pagination.limit === 100);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Calculate expected pages based on records and limit
  const expectedPages = Math.ceil(response.pagination.records / 100);
  TestValidator.equals(
    "pages metadata matches calculation",
    response.pagination.pages,
    expectedPages,
  );
  // Step 4: Verify communities are sorted by subscriber_count in descending order
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      TestValidator.predicate(
        `community at index ${i} has >= subscriber count than community at index ${i + 1}`,
        current.subscriber_count >= next.subscriber_count,
      );
    }
  }
  // Step 5: Test pagination with limit of 2
  const paginatedResponse = await api.functional.redditClone.communities.index(
    connection,
    {
      body: {
        sortBy: "subscriberCount",
        page: 1,
        limit: 2,
      } satisfies IRedditCloneCommunityBan.IRequest,
    },
  );
  typia.assert(paginatedResponse);
  // Verify only 2 communities are returned per page (or less on final page)
  TestValidator.predicate(
    "page 1 returns at most 2 communities",
    paginatedResponse.data.length <= 2,
  );
  TestValidator.equals(
    "paginated limit is 2",
    paginatedResponse.pagination.limit,
    2,
  );
  // Step 6: Verify pages metadata reflects total available communities
  TestValidator.predicate(
    "pages metadata is non-negative",
    paginatedResponse.pagination.pages >= 0,
  );
  // If there are more than 2 communities total, verify multi-page structure
  if (response.pagination.records > 2) {
    TestValidator.predicate(
      "there are multiple pages when records exceed limit",
      paginatedResponse.pagination.pages > 1,
    );
  }
}
