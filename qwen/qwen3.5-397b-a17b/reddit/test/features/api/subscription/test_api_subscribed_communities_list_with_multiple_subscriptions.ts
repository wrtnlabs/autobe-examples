import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test the primary success scenario where a member retrieves their list of subscribed communities.
 *
 * This test validates:
 * 1. Member authentication and setup
 * 2. Creation of three distinct communities
 * 3. Member subscription to all three communities
 * 4. Retrieval of subscribed communities list via PATCH /redditClone/member/subscribed
 * 5. Response validation including pagination metadata and community details
 * 6. Verification that all subscribed communities are returned with correct data
 */
export async function test_api_subscribed_communities_list_with_multiple_subscriptions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create three distinct communities for subscription testing
  const community1 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: `community_test_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.assert<string & tags.MaxLength<80000>>(typia.random<string & tags.Format<"uri">>()),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community1);
  const community2 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: `community_test_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community2);
  const community3 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: `community_test_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: typia.assert<string & tags.MaxLength<80000>>(typia.random<string & tags.Format<"uri">>()),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community3);
  // 3. Subscribe member to all three communities
  const subscription1 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community1.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community2.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  const subscription3 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community3.id,
        } satisfies IRedditCloneSubscription.ICreate,
      },
    );
  typia.assert(subscription3);
  // 4. Retrieve subscribed communities list with default pagination
  const response = await api.functional.redditClone.member.subscribed.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneSubscription.IRequest,
    },
  );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    response.pagination.limit > 0,
  );
  TestValidator.equals(
    "total records should be 3",
    response.pagination.records,
    3,
  );
  TestValidator.equals("total pages should be 1", response.pagination.pages, 1);
  // 6. Validate data array contains all three subscribed communities
  TestValidator.equals("data array length", response.data.length, 3);
  // 7. Verify all created communities are in the response
  const communityIds = response.data.map((c) => c.id);
  TestValidator.predicate(
    "community1 in response",
    communityIds.includes(community1.id),
  );
  TestValidator.predicate(
    "community2 in response",
    communityIds.includes(community2.id),
  );
  TestValidator.predicate(
    "community3 in response",
    communityIds.includes(community3.id),
  );
  // 8. Validate subscriber counts are updated (each community should have at least 1 subscriber)
  for (const community of response.data) {
    TestValidator.predicate(
      "subscriber count is at least 1",
      community.subscriber_count >= 1,
    );
  }
}