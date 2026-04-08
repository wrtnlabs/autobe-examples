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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test filtering the subscription list by community name search term.
 *
 * Validates the subscription list filtering functionality by authenticating a member, subscribing them to multiple communities with distinct names, and verifying that the communityName filter correctly returns only matching subscriptions. The filter performs case-insensitive partial matching on community names via JOIN with the communities table.
 *
 * Special attention is given to verifying that the filtering works correctly with the community name field, and that pagination still functions properly when combined with the filter.
 *
 * 1. Authenticate a new member account.
 * 2. List existing communities to find ones with distinct names.
 * 3. Subscribe the member to multiple communities with different names.
 * 4. Retrieve the subscription list without filter to verify all subscriptions exist.
 * 5. Retrieve the subscription list with a communityName filter parameter.
 * 6. Verify that only subscriptions matching the search term are returned.
 * 7. Validate pagination works correctly when combined with filtering.
 */
export async function test_api_subscription_list_filter_by_community_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  // 2. List existing communities to find ones with distinct names
  const communitiesResponse =
    await api.functional.redditClone.communities.index(memberConnection, {
      body: {
        limit: 10,
      } satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(communitiesResponse);
  // Select up to 3 communities with distinct names
  const selectedCommunities = communitiesResponse.data.slice(0, 3);
  if (selectedCommunities.length < 2) {
    throw new Error(
      "Not enough communities available for testing subscription filtering",
    );
  }
  // 3. Subscribe the member to multiple communities with different names
  await ArrayUtil.asyncForEach(selectedCommunities, async (community) => {
    await api.functional.redditClone.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCloneCommunitySubscription.ICreate,
      },
    );
  });
  // 4. Retrieve the subscription list without filter to verify all subscriptions exist
  const allSubscriptions =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {} satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(allSubscriptions);
  TestValidator.predicate(
    "all subscriptions created successfully",
    allSubscriptions.data.length >= selectedCommunities.length,
  );
  // 5. Retrieve the subscription list with a communityName filter parameter
  const searchCommunity = selectedCommunities[0];
  const searchTerm = searchCommunity.name.substring(
    0,
    Math.max(1, Math.floor(searchCommunity.name.length / 2)),
  );
  const filteredSubscriptions =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          communityName: searchTerm,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(filteredSubscriptions);
  // 6. Verify that only subscriptions matching the search term are returned
  TestValidator.predicate(
    "filtered subscriptions contain matching community",
    filteredSubscriptions.data.some((sub) =>
      sub.community.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  // Verify all returned subscriptions match the search term
  const allMatch = filteredSubscriptions.data.every((sub) =>
    sub.community.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  TestValidator.predicate(
    "all returned subscriptions match search term",
    allMatch,
  );
  // 7. Validate pagination works correctly when combined with filtering
  const paginatedSubscriptions =
    await api.functional.redditClone.member.subscriptions.index(
      memberConnection,
      {
        body: {
          communityName: searchTerm,
          page: 1,
          limit: 1,
        } satisfies IRedditCloneCommunitySubscription.IRequest,
      },
    );
  typia.assert(paginatedSubscriptions);
  TestValidator.equals(
    "pagination limit respected with filter",
    paginatedSubscriptions.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginatedSubscriptions.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    paginatedSubscriptions.pagination.limit,
    1,
  );
}
