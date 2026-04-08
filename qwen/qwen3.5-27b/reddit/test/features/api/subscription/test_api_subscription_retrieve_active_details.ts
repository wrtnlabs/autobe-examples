import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunity";
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
 * Test retrieving an active community subscription by its unique identifier.
 *
 * Validates the complete subscription retrieval flow including member registration, community discovery, subscription creation, and detailed subscription data verification. Ensures that the subscription endpoint returns all required nested objects with proper population of member information, community details, and timestamp fields.
 *
 * Special attention is given to verifying that active subscriptions have null deleted_at values and that all nested objects (member profile, community owner) are correctly structured according to the schema definitions.
 *
 * 1. Register a new member account with email, password, and unique username.
 * 2. List available communities to find one to subscribe to.
 * 3. Subscribe the authenticated member to a community.
 * 4. Retrieve the subscription details using the subscription ID.
 * 5. Validate that all fields are present and correctly populated.
 * 6. Verify deleted_at is null for active subscriptions.
 * 7. Verify nested member and community objects contain expected data.
 */
export async function test_api_subscription_retrieve_active_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
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
  // 2. List available communities
  const communitiesResponse =
    await api.functional.redditClone.communities.index(memberConnection, {
      body: {} satisfies IRedditCloneCommunity.IRequest,
    });
  typia.assert(communitiesResponse);
  // Select the first community for subscription (assuming at least one exists)
  const targetCommunity = communitiesResponse.data[0];
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.redditClone.member.subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: targetCommunity.id,
        } satisfies IRedditCloneCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Retrieve the subscription details by ID
  const retrievedSubscription =
    await api.functional.redditClone.member.subscriptions.at(memberConnection, {
      subscriptionId: subscription.id,
    });
  typia.assert(retrievedSubscription);
  // 5. Validate subscription fields
  TestValidator.equals(
    "subscription ID matches",
    retrievedSubscription.id,
    subscription.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedSubscription.community.id,
    targetCommunity.id,
  );
  TestValidator.equals(
    "member email matches",
    retrievedSubscription.member.email,
    member.email,
  );
  TestValidator.equals(
    "member username matches",
    retrievedSubscription.member.username,
    member.username,
  );
  // 6. Verify deleted_at is null for active subscription
  TestValidator.equals(
    "deleted_at is null for active subscription",
    retrievedSubscription.deleted_at,
    null,
  );
  // 7. Verify member profile nested object
  TestValidator.predicate(
    "member profile has display_name",
    retrievedSubscription.member.profile.display_name !== undefined,
  );
  TestValidator.predicate(
    "member profile has karma",
    typeof retrievedSubscription.member.profile.karma === "number",
  );
  TestValidator.predicate(
    "member profile has created_at",
    retrievedSubscription.member.profile.created_at !== undefined,
  );
  // 8. Verify community nested object
  TestValidator.equals(
    "community name matches",
    retrievedSubscription.community.name,
    targetCommunity.name,
  );
  TestValidator.predicate(
    "community has description",
    retrievedSubscription.community.description !== undefined,
  );
  TestValidator.predicate(
    "community has owner",
    retrievedSubscription.community.owner !== undefined,
  );
  TestValidator.predicate(
    "community has subscriber_count",
    typeof retrievedSubscription.community.subscriber_count === "number",
  );
  // 9. Verify timestamps
  TestValidator.predicate(
    "created_at is valid datetime",
    retrievedSubscription.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    retrievedSubscription.updated_at !== undefined,
  );
}
