import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";

/**
 * Test that an authenticated member can successfully retrieve their active subscription details.
 *
 * Validates the complete subscription retrieval workflow including member authentication, subscription creation, and detailed subscription information verification. Ensures that the subscription response contains all required fields including member information, community details, and timestamps.
 *
 * Special attention is given to verifying that the subscription is active (deleted_at is null) and that all nested objects (member profile, community owner) are correctly populated with their respective fields.
 *
 * 1. Authenticate a new member via join endpoint with email, password, and username.
 * 2. Create a subscription to an existing community using the authenticated member connection.
 * 3. Retrieve the subscription details using communityId and subscriptionId from creation response.
 * 4. Verify the subscription object contains all required fields: id, member, community, created_at, updated_at, deleted_at.
 * 5. Verify member object contains email, username, created_at, and profile with display_name, bio, avatar, karma.
 * 6. Verify community object contains name, description, icon, owner, subscriber_count, created_at.
 * 7. Verify deleted_at is null indicating the subscription is active.
 */
export async function test_api_subscription_view_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  // 2. Create subscription to existing community
  // Note: We need a community ID. Since we don't have a community creation utility,
  // we'll use a random UUID and assume the test environment has communities.
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: { communityId },
      },
    );
  typia.assert(subscription);
  // 3. Retrieve subscription details
  const retrievedSubscription =
    await api.functional.redditClone.communities.subscriptions.at(
      memberConnection,
      {
        communityId: subscription.community.id,
        subscriptionId: subscription.id,
      },
    );
  typia.assert(retrievedSubscription);
  // 4. Verify subscription object contains all required fields
  TestValidator.equals(
    "subscription id matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "community id matches",
    retrievedSubscription.community.id,
    subscription.community.id,
  );
  // 5. Verify member object structure
  TestValidator.equals(
    "member id matches",
    retrievedSubscription.member.id,
    subscription.member.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedSubscription.member.email,
    subscription.member.email,
  );
  TestValidator.equals(
    "member username matches",
    retrievedSubscription.member.username,
    subscription.member.username,
  );
  TestValidator.predicate(
    "member has created_at",
    retrievedSubscription.member.created_at !== undefined,
  );
  TestValidator.predicate(
    "member has profile",
    retrievedSubscription.member.profile !== undefined,
  );
  // 6. Verify member profile structure
  TestValidator.predicate(
    "profile has display_name",
    retrievedSubscription.member.profile.display_name !== undefined,
  );
  TestValidator.predicate(
    "profile has karma",
    typeof retrievedSubscription.member.profile.karma === "number",
  );
  TestValidator.predicate(
    "profile has created_at",
    retrievedSubscription.member.profile.created_at !== undefined,
  );
  // bio and avatar can be null - verify they are either string or null
  TestValidator.predicate(
    "profile bio is valid",
    retrievedSubscription.member.profile.bio === null ||
      typeof retrievedSubscription.member.profile.bio === "string",
  );
  TestValidator.predicate(
    "profile avatar is valid",
    retrievedSubscription.member.profile.avatar === null ||
      typeof retrievedSubscription.member.profile.avatar === "string",
  );
  // 7. Verify community object structure
  TestValidator.predicate(
    "community has name",
    retrievedSubscription.community.name !== undefined,
  );
  TestValidator.predicate(
    "community has description",
    retrievedSubscription.community.description !== undefined,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    typeof retrievedSubscription.community.subscriber_count === "number",
  );
  TestValidator.predicate(
    "community has created_at",
    retrievedSubscription.community.created_at !== undefined,
  );
  // icon can be null
  TestValidator.predicate(
    "community icon is valid",
    retrievedSubscription.community.icon === null ||
      typeof retrievedSubscription.community.icon === "string",
  );
  // owner profile
  TestValidator.predicate(
    "community has owner",
    retrievedSubscription.community.owner !== undefined,
  );
  TestValidator.predicate(
    "owner has display_name",
    retrievedSubscription.community.owner.display_name !== undefined,
  );
  TestValidator.predicate(
    "owner has karma",
    typeof retrievedSubscription.community.owner.karma === "number",
  );
  // 8. Verify timestamps
  TestValidator.predicate(
    "subscription has created_at",
    retrievedSubscription.created_at !== undefined,
  );
  TestValidator.predicate(
    "subscription has updated_at",
    retrievedSubscription.updated_at !== undefined,
  );
  // 9. Verify deleted_at is null (active subscription)
  TestValidator.equals(
    "subscription is active (deleted_at is null)",
    retrievedSubscription.deleted_at,
    null,
  );
}
