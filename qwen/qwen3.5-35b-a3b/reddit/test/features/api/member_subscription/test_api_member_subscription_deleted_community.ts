import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

/**
 * Test subscription retrieval when community has been soft-deleted.
 * Validates that subscription records persist and community data is preserved after community deletion.
 */
export async function test_api_member_subscription_deleted_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: typia.random<string & tags.MinLength<3> & tags.MaxLength<20>>(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await api.functional.redditPlatform.member.subscriptions.create(
      memberConnection,
      {
        body: {
          confirmSubscription: true,
        } satisfies IRedditPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Verify subscription was created successfully
  TestValidator.equals(
    "subscription has member ID",
    subscription.redditPlatformMemberId,
    member.id,
  );
  TestValidator.equals(
    "subscription has community ID",
    subscription.redditPlatformCommunityId,
    community.id,
  );
  TestValidator.equals(
    "subscription name matches",
    subscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "subscription description matches",
    subscription.community.description,
    community.description,
  );
  TestValidator.equals(
    "subscription deleted_at is null",
    subscription.deletedAt,
    null,
  );
  // 5. Delete the community (soft deletion)
  await api.functional.redditPlatform.member.communities.erase(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 6. Retrieve subscription after community deletion
  const retrievedSubscription =
    await api.functional.redditPlatform.member.subscriptions.at(
      memberConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);
  // 7. Validate subscription still exists after community deletion
  TestValidator.equals(
    "subscription ID preserved after community deletion",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "subscription member ID preserved",
    retrievedSubscription.redditPlatformMemberId,
    member.id,
  );
  TestValidator.equals(
    "subscription community ID preserved",
    retrievedSubscription.redditPlatformCommunityId,
    community.id,
  );
  // 8. Validate community relationship data is preserved despite community deletion
  TestValidator.equals(
    "community name preserved after deletion",
    retrievedSubscription.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description preserved after deletion",
    retrievedSubscription.community.description,
    community.description,
  );
  if (community.icon_url) {
    TestValidator.equals(
      "community icon URL preserved after deletion",
      retrievedSubscription.community.icon_url,
      community.icon_url,
    );
  }
  TestValidator.equals(
    "community subscriber_count preserved after deletion",
    retrievedSubscription.community.subscriber_count,
    community.subscriber_count,
  );
  TestValidator.equals(
    "community author preserved after deletion",
    retrievedSubscription.community.author.id,
    member.id,
  );
  TestValidator.equals(
    "community author username preserved after deletion",
    retrievedSubscription.community.author.username,
    member.username,
  );
  // 9. Validate subscription timestamps are preserved
  TestValidator.equals(
    "subscription subscribed_at preserved",
    retrievedSubscription.subscribedAt,
    subscription.subscribedAt,
  );
  TestValidator.equals(
    "subscription created_at preserved",
    retrievedSubscription.createdAt,
    subscription.createdAt,
  );
  TestValidator.equals(
    "subscription updated_at preserved",
    retrievedSubscription.updatedAt,
    subscription.updatedAt,
  );
  // 10. Validate subscription is still active (not deleted)
  TestValidator.equals(
    "subscription deleted_at remains null after community deletion",
    retrievedSubscription.deletedAt,
    null,
  );
  // 11. Validate member relationship is preserved
  TestValidator.equals(
    "member username preserved in subscription",
    retrievedSubscription.member.username,
    member.username,
  );
  TestValidator.equals(
    "member display name preserved in subscription",
    retrievedSubscription.member.displayName,
    member.displayName,
  );
}
