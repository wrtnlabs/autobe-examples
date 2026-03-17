import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
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
 * Test that an authenticated member can successfully retrieve their list of subscribed communities.
 * The member first joins the platform, then subscribes to multiple communities.
 * When calling the subscriptions list endpoint, verify that:
 * (1) all active subscriptions are returned with correct community details
 * (2) pagination metadata is accurate
 * (3) subscriptions are sorted by created_at DESC by default (newest first)
 * (4) each subscription includes the complete community summary object.
 */
export async function test_api_subscription_list_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create multiple communities to subscribe to
  const community1 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community1);
  const community2 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community2);
  const community3 = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community3);
  // 3. Subscribe to all three communities
  const subscription1 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community1.id },
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community2.id },
      },
    );
  typia.assert(subscription2);
  const subscription3 =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community3.id },
      },
    );
  typia.assert(subscription3);
  // 4. Retrieve subscriptions list with default sorting (created_at DESC)
  const response = await api.functional.redditClone.member.subscriptions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCloneSubscription.IRequest,
    },
  );
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.equals("current page", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 10);
  TestValidator.equals("total records", response.pagination.records, 3);
  TestValidator.equals("total pages", response.pagination.pages, 1);
  // 6. Validate all subscriptions are returned
  TestValidator.equals("subscription count", response.data.length, 3);
  // 7. Validate community details in each subscription
  const returnedCommunityIds = response.data.map((sub) => sub.community.id);
  TestValidator.predicate(
    "all communities present",
    () =>
      returnedCommunityIds.includes(community1.id) &&
      returnedCommunityIds.includes(community2.id) &&
      returnedCommunityIds.includes(community3.id),
  );
  // 8. Validate each subscription has complete community summary
  for (const subscription of response.data) {
    TestValidator.predicate(
      "community has name",
      () => subscription.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has description",
      () => subscription.community.description.length > 0,
    );
    TestValidator.predicate(
      "community has owner",
      () => subscription.community.owner.id !== undefined,
    );
    TestValidator.predicate(
      "subscriber count positive",
      () => subscription.community.subscriber_count >= 1,
    );
  }
  // 9. Validate sorting by created_at DESC (newest first)
  for (let i = 0; i < response.data.length - 1; i++) {
    const currentTime = new Date(response.data[i].created_at).getTime();
    const nextTime = new Date(response.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      `subscription ${i} is newer than ${i + 1}`,
      () => currentTime >= nextTime,
    );
  }
}
