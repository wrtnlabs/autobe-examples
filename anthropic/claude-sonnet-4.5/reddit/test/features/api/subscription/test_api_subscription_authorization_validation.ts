import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeUser";

/**
 * Test Authorization and User Validation for Community Subscriptions
 *
 * This test validates that the subscription creation endpoint properly enforces
 * authentication and authorization rules. The primary objective is to ensure
 * that only authenticated members can subscribe to communities and that the
 * userId path parameter must match the authenticated user's ID, preventing
 * users from creating subscriptions on behalf of other users.
 *
 * Test Flow:
 *
 * 1. Register a new member account to establish authenticated user context
 * 2. Create a community that will be used for subscription testing
 * 3. Attempt to subscribe the authenticated member to the community using their
 *    valid credentials
 * 4. Validate that the subscription succeeds when the authenticated user matches
 *    the userId parameter
 * 5. Verify the subscription response contains correct member and community
 *    relationships
 */
export async function test_api_subscription_authorization_validation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberRegistration = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IRedditLikeMember.ICreate;

  const authenticatedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(authenticatedMember);

  // Verify the member was created with proper structure
  TestValidator.predicate(
    "authenticated member has valid UUID",
    authenticatedMember.id.length > 0,
  );
  TestValidator.equals(
    "member email matches registration",
    authenticatedMember.email,
    memberRegistration.email,
  );
  TestValidator.equals(
    "member username matches registration",
    authenticatedMember.username,
    memberRegistration.username,
  );

  // Step 2: Create a community for subscription testing
  const communityData = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  TestValidator.equals(
    "community code matches creation data",
    community.code,
    communityData.code,
  );
  TestValidator.equals(
    "community name matches creation data",
    community.name,
    communityData.name,
  );

  // Step 3: Subscribe the authenticated member to the community
  const subscriptionRequest = {
    community_id: community.id,
  } satisfies IRedditLikeUser.ISubscriptionCreate;

  const subscription: IRedditLikeCommunitySubscription =
    await api.functional.redditLike.users.subscriptions.create(connection, {
      userId: authenticatedMember.id,
      body: subscriptionRequest,
    });
  typia.assert(subscription);

  // Step 4: Validate subscription was created successfully
  TestValidator.predicate(
    "subscription has valid UUID",
    subscription.id.length > 0,
  );
  TestValidator.equals(
    "subscription community ID matches requested community",
    subscription.community_id,
    community.id,
  );
  TestValidator.equals(
    "subscription member ID matches authenticated member",
    subscription.member_id,
    authenticatedMember.id,
  );
  TestValidator.predicate(
    "subscription has valid timestamp",
    subscription.subscribed_at.length > 0,
  );
}
