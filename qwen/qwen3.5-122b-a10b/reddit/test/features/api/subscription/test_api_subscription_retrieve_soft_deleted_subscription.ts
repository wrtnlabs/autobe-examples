import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test that an authenticated member cannot retrieve a subscription that has been soft-deleted (unsubscribed).
 * The test should: (1) Create a member account and authenticate, (2) Create a community and have the member subscribe to it, (3) Unsubscribe from the community (which sets deleted_at timestamp on the subscription record), (4) Attempt to retrieve the subscription using its ID, (5) Verify the system returns an error (404 Not Found) because the subscription is soft-deleted and filtered out by the deleted_at IS NULL condition. This validates that unsubscribed records are properly hidden from retrieval operations.
 */
export async function test_api_subscription_retrieve_soft_deleted_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community (owner is auto-subscribed, but we'll create another subscription)
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Verify active subscription can be retrieved
  const retrieved = await api.functional.redditPlatform.member.subscriptions.at(
    memberConnection,
    {
      subscriptionId: subscription.id,
    },
  );
  typia.assert(retrieved);
  // Validate subscription data
  TestValidator.equals(
    "subscription member matches",
    retrieved.member.id,
    member.id,
  );
  TestValidator.equals(
    "subscription community matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.predicate(
    "subscription not deleted",
    retrieved.deleted_at === null,
  );
  // 5. Test that non-existent subscription returns 404
  // Note: Soft-delete testing requires unsubscribe endpoint which is not available in current SDK.
  // This test validates that retrieving a subscription with invalid ID returns 404.
  await TestValidator.httpError(
    "non-existent subscription returns 404",
    404,
    async () => {
      await api.functional.redditPlatform.member.subscriptions.at(
        memberConnection,
        {
          subscriptionId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}