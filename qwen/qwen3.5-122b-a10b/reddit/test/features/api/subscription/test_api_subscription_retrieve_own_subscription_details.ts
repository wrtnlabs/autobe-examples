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
 * Test that an authenticated member can successfully retrieve detailed information about their own community subscription.
 *
 * This test validates:
 * 1. The subscription record exists and is not soft-deleted
 * 2. The response includes complete subscription details with embedded member information (username, display_name, karma_score) and community information (name, description, subscriber_count, owner)
 * 3. The subscription timestamps (created_at, updated_at, deleted_at) are correctly populated with deleted_at being null for active subscriptions
 * 4. The member_id in the subscription matches the authenticated member's ID, confirming ownership authorization
 */
export async function test_api_subscription_retrieve_own_subscription_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community (member becomes owner and is auto-subscribed)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Retrieve the subscription (owner is auto-subscribed, need to find subscription ID)
  // Since we don't have a direct way to list subscriptions, we'll use the community subscription create to get a new subscription
  // Actually, the owner is auto-subscribed when community is created, so we need to get that subscription
  // For this test, we'll create a new subscription with a different member to test retrieval
  // Create a second member to subscribe
  const subscriberConnection: api.IConnection = { host: connection.host };
  const subscriber = await authorize_member_join(subscriberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(subscriber);
  // Subscribe to the community
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      subscriberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Retrieve the subscription by ID
  const retrievedSubscription =
    await api.functional.redditPlatform.member.subscriptions.at(
      subscriberConnection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);
  // 5. Validate subscription details
  TestValidator.equals(
    "subscription ID matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedSubscription.member.id,
    subscriber.id,
  );
  TestValidator.equals(
    "member username matches",
    retrievedSubscription.member.username,
    subscriber.username,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedSubscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    retrievedSubscription.community.name,
    community.name,
  );
  TestValidator.predicate(
    "deleted_at is null for active subscription",
    retrievedSubscription.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is populated",
    retrievedSubscription.created_at !== null &&
      retrievedSubscription.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is populated",
    retrievedSubscription.updated_at !== null &&
      retrievedSubscription.updated_at !== undefined,
  );
}