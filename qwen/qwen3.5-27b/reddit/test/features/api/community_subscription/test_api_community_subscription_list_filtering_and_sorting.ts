import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IPageIRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunitySubscription";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering and sorting capabilities for community subscription lists.
 *
 * Validates the complete subscription filtering and sorting workflow including date range filtering, community name search, and multiple sorting options. Ensures that pagination works correctly with filtered results and that each filter and sort combination returns properly ordered data.
 *
 * The test retrieves existing communities and their subscriptions, then validates various filtering scenarios including date ranges, text search, and sorting by different fields in both ascending and descending order.
 *
 * 1. Retrieve existing communities and select one for testing
 * 2. Fetch existing subscriptions for the selected community
 * 3. Test date range filtering with subscribedAfter and subscribedBefore parameters
 * 4. Test community name search with partial matching
 * 5. Test sorting by created_at, community_name, and member_username
 * 6. Verify pagination metadata is correct for filtered results
 * 7. Validate that filter combinations work together correctly
 */
export async function test_api_community_subscription_list_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve existing communities and select one for testing
  const guestConnection: api.IConnection = { host: connection.host };
  const communitiesResponse =
    await api.functional.redditClone.communities.index(guestConnection, {
      body: { limit: 10 } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(communitiesResponse);
  if (communitiesResponse.data.length === 0) {
    throw new Error(
      "No communities available for testing. Please create a community first.",
    );
  }
  const testCommunity = communitiesResponse.data[0];
  typia.assert(testCommunity);
  // 2. Fetch existing subscriptions for the selected community
  const adminConnection: api.IConnection = { host: connection.host };
  const allSubscriptions =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          limit: 100,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  if (allSubscriptions.data.length === 0) {
    throw new Error(
      `No subscriptions found for community ${testCommunity.name}. Please subscribe some members first.`,
    );
  }
  // 3. Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(
    now.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Filter subscriptions created after a specific date
  const recentSubscriptions =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          subscribedAfter: oneDayAgo,
          limit: 100,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(recentSubscriptions);
  TestValidator.predicate(
    "recent subscriptions filtered correctly",
    recentSubscriptions.data.every((sub) => sub.created_at >= oneDayAgo),
  );
  // Filter subscriptions created before a specific date
  const beforeNowSubscriptions =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          subscribedBefore: now.toISOString(),
          limit: 100,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(beforeNowSubscriptions);
  TestValidator.predicate(
    "subscriptions before now filtered correctly",
    beforeNowSubscriptions.data.every(
      (sub) => sub.created_at <= now.toISOString(),
    ),
  );
  // Test date range (between two dates)
  const dateRangeSubscriptions =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          subscribedAfter: twoDaysAgo,
          subscribedBefore: now.toISOString(),
          limit: 100,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(dateRangeSubscriptions);
  TestValidator.predicate(
    "date range filter works correctly",
    dateRangeSubscriptions.data.every(
      (sub) =>
        sub.created_at >= twoDaysAgo && sub.created_at <= now.toISOString(),
    ),
  );
  // 4. Test community name search
  const searchSubscriptions =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          communityName: testCommunity.name.substring(0, 3),
          limit: 100,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(searchSubscriptions);
  TestValidator.predicate(
    "community name search returns matching results",
    searchSubscriptions.data.every((sub) =>
      sub.community.name
        .toLowerCase()
        .includes(testCommunity.name.toLowerCase().substring(0, 3)),
    ),
  );
  // 5. Test sorting options
  // Sort by created_at descending (newest first)
  const sortedByDateDesc =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          sort: "created_at",
          order: "desc",
          limit: 100,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedByDateDesc);
  if (sortedByDateDesc.data.length > 1) {
    TestValidator.predicate(
      "sorted by created_at descending",
      sortedByDateDesc.data.every((sub, index, array) => {
        if (index === 0) return true;
        return sub.created_at <= array[index - 1].created_at;
      }),
    );
  }
  // Sort by created_at ascending (oldest first)
  const sortedByDateAsc =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          sort: "created_at",
          order: "asc",
          limit: 100,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedByDateAsc);
  if (sortedByDateAsc.data.length > 1) {
    TestValidator.predicate(
      "sorted by created_at ascending",
      sortedByDateAsc.data.every((sub, index, array) => {
        if (index === 0) return true;
        return sub.created_at >= array[index - 1].created_at;
      }),
    );
  }
  // Sort by community_name alphabetically
  const sortedByCommunityName =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          sort: "community_name",
          order: "asc",
          limit: 100,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedByCommunityName);
  if (sortedByCommunityName.data.length > 1) {
    TestValidator.predicate(
      "sorted by community_name ascending",
      sortedByCommunityName.data.every((sub, index, array) => {
        if (index === 0) return true;
        return (
          sub.community.name.localeCompare(array[index - 1].community.name) >= 0
        );
      }),
    );
  }
  // Sort by member_username alphabetically
  const sortedByUsername =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          sort: "member_username",
          order: "asc",
          limit: 100,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(sortedByUsername);
  if (sortedByUsername.data.length > 1) {
    TestValidator.predicate(
      "sorted by member_username ascending",
      sortedByUsername.data.every((sub, index, array) => {
        if (index === 0) return true;
        return (
          sub.member.username.localeCompare(array[index - 1].member.username) >=
          0
        );
      }),
    );
  }
  // 6. Test pagination with filtered results
  const paginatedResult =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          page: 1,
          limit: 2,
          sort: "created_at",
          order: "desc",
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    Math.min(2, allSubscriptions.data.length),
  );
  TestValidator.predicate(
    "pagination metadata is correct",
    paginatedResult.pagination.limit === 2 &&
      paginatedResult.pagination.current === 1,
  );
  // 7. Test filter combinations
  const combinedFilters =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          communityName: testCommunity.name.substring(0, 3),
          subscribedAfter: twoDaysAgo,
          sort: "created_at",
          order: "desc",
          page: 1,
          limit: 50,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedFilters.data.every(
      (sub) =>
        sub.community.name
          .toLowerCase()
          .includes(testCommunity.name.toLowerCase().substring(0, 3)) &&
        sub.created_at >= twoDaysAgo,
    ),
  );
  // Test empty result set with non-matching search
  const emptySearch =
    await api.functional.redditClone.communities.subscriptions.index(
      adminConnection,
      {
        communityId: testCommunity.id,
        body: {
          communityName: "nonexistent_community_xyz",
          limit: 10,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "non-matching search returns empty results",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination is correct",
    emptySearch.pagination.records,
    0,
  );
}
