import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";

/**
 * Test subscription list retrieval with multiple communities and pagination.
 *
 * Validates that a member can successfully view their subscribed communities with proper embedded community summaries and pagination metadata. The test ensures subscription relationships are correctly maintained and the API returns accurate pagination information.
 *
 * The workflow covers: member authentication, creation of multiple communities, subscription to each community, and retrieval of the subscription list with pagination verification.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Member creates three distinct communities with unique names.
 * 3. Member subscribes to each of the three communities.
 * 4. Retrieves subscription list with limit=2 to test pagination.
 * 5. Validates response contains correct pagination metadata (current page, limit, total records, total pages).
 * 6. Validates each subscription contains embedded community summary with all required fields.
 * 7. Verifies subscriptions are sorted by created_at descending.
 */
export async function test_api_subscription_list_with_multiple_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create three distinct communities
  const communities: IRedditLikeCommunity[] = [];
  for (let i = 0; i < 3; i++) {
    const community = await api.functional.redditLike.member.communities.create(
      memberConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
    typia.assert(community);
    communities.push(community);
  }
  // 3. Subscribe to each community
  const subscriptions: IRedditLikeCommunitySubscription[] = [];
  for (const community of communities) {
    const subscription =
      await api.functional.redditLike.member.subscriptions.create(
        memberConnection,
        {
          body: {
            communityId: community.id,
          } satisfies IRedditLikeCommunitySubscription.ICreate,
        },
      );
    typia.assert(subscription);
    subscriptions.push(subscription);
  }
  // 4. Retrieve subscription list with pagination (limit=2)
  const subscriptionList: IPageIRedditLikeCommunitySubscription.ISummary =
    await api.functional.redditLike.member.subscriptions.index(
      memberConnection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies IRedditLikeCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionList);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", subscriptionList.pagination.current, 1);
  TestValidator.equals("limit", subscriptionList.pagination.limit, 2);
  TestValidator.equals("total records", subscriptionList.pagination.records, 3);
  TestValidator.equals("total pages", subscriptionList.pagination.pages, 2);
  // 6. Validate subscription count matches limit
  TestValidator.equals(
    "data count matches limit",
    subscriptionList.data.length,
    2,
  );
  // 7. Validate each subscription has embedded community summary
  for (const subscription of subscriptionList.data) {
    TestValidator.predicate(
      "has community",
      subscription.community !== undefined,
    );
    TestValidator.predicate(
      "has community id",
      subscription.community.id !== undefined,
    );
    TestValidator.predicate(
      "has community name",
      subscription.community.name !== undefined,
    );
    TestValidator.predicate("has member", subscription.member !== undefined);
    TestValidator.predicate(
      "has created_at",
      subscription.created_at !== undefined,
    );
  }
  // 8. Verify subscriptions are sorted by created_at descending (newest first)
  const createdDates = subscriptionList.data.map((s) =>
    new Date(s.created_at).getTime(),
  );
  for (let i = 0; i < createdDates.length - 1; i++) {
    TestValidator.predicate(
      `subscription ${i} is newer than ${i + 1}`,
      createdDates[i] >= createdDates[i + 1],
    );
  }
}
