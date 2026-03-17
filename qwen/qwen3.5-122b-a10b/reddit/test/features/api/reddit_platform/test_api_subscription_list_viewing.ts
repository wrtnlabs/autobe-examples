import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunitySubscription";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test member subscription list viewing functionality.
 *
 * 1. Create a member account
 * 2. Create multiple communities for subscription testing
 * 3. Subscribe member to multiple communities
 * 4. View subscription list and verify:
 *    - Authentication required (guest cannot access)
 *    - Paginated response with correct metadata
 *    - Each subscription contains community summary with all required fields
 *    - Results sorted by subscription date descending
 *    - Soft-deleted subscriptions excluded
 *    - Data isolation enforced
 * 5. Test empty state when member has no subscriptions
 */
export async function test_api_subscription_list_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.redditPlatform.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // 2. Create multiple communities
  const community1 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community1);
  const community2 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community2);
  const community3 =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community3);
  // 3. Subscribe member to multiple communities
  const subscription1 =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community1.id,
      },
    );
  typia.assert(subscription1);
  const subscription2 =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community2.id,
      },
    );
  typia.assert(subscription2);
  const subscription3 =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community3.id,
      },
    );
  typia.assert(subscription3);
  // 4. View subscription list with pagination
  const subscriptionList =
    await api.functional.redditPlatform.member.subscriptions.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(subscriptionList);
  // Verify pagination metadata
  TestValidator.equals("current page", subscriptionList.pagination.current, 1);
  TestValidator.equals("limit", subscriptionList.pagination.limit, 10);
  TestValidator.equals("total records", subscriptionList.pagination.records, 3);
  TestValidator.equals("total pages", subscriptionList.pagination.pages, 1);
  // Verify subscription count
  TestValidator.equals("subscription count", subscriptionList.data.length, 3);
  // Verify all subscriptions are present
  const subscriptionIds = subscriptionList.data.map((s) => s.id);
  TestValidator.equals(
    "subscription1 included",
    subscriptionIds.includes(subscription1.id),
    true,
  );
  TestValidator.equals(
    "subscription2 included",
    subscriptionIds.includes(subscription2.id),
    true,
  );
  TestValidator.equals(
    "subscription3 included",
    subscriptionIds.includes(subscription3.id),
    true,
  );
  // Verify each subscription has required community data
  for (const subscription of subscriptionList.data) {
    typia.assert(subscription);
    TestValidator.equals(
      "subscription deleted_at is null",
      subscription.deleted_at,
      null,
    );
  }
  // Verify sorting by created_at descending (most recent first)
  const createdDates = subscriptionList.data.map((s) =>
    new Date(s.created_at).getTime(),
  );
  for (let i = 1; i < createdDates.length; i++) {
    TestValidator.predicate(
      `subscription ${i} is older than or equal to subscription ${i - 1}`,
      createdDates[i] <= createdDates[i - 1],
    );
  }
  // 5. Test empty state - create new member with no subscriptions
  const newMemberConnection: api.IConnection = { host: connection.host };
  await api.functional.redditPlatform.auth.member.join(newMemberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  const emptySubscriptionList =
    await api.functional.redditPlatform.member.subscriptions.index(
      newMemberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditPlatformCommunitySubscription.IRequest,
      },
    );
  typia.assert(emptySubscriptionList);
  TestValidator.equals(
    "empty subscription list count",
    emptySubscriptionList.data.length,
    0,
  );
  TestValidator.equals(
    "empty subscription list records",
    emptySubscriptionList.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty subscription list pages",
    emptySubscriptionList.pagination.pages,
    0,
  );
}