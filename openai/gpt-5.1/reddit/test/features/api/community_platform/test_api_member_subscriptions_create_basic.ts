import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that an authenticated member user can create a basic community
 * subscription.
 *
 * Business flow:
 *
 * 1. Register a new member user using the public join endpoint.
 * 2. With the authenticated member session (token auto-attached by SDK), create a
 *    community.
 * 3. Create a subscription for that community via the memberUser subscription
 *    endpoint.
 * 4. Assert that the created subscription is correctly linked to the member and
 *    community and has a sensible status.
 */
export async function test_api_member_subscriptions_create_basic(
  connection: api.IConnection,
) {
  // 1. Register a new member user (authentication established by SDK)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community using the member user context
  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community id should be a UUID string",
    community.id,
    community.id,
  );

  // 3. Create a subscription for that community
  const subscriptionCreateBody = {
    community_id: community.id,
    // omit status to exercise defaulting behavior on server side
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 4. Business assertions on linkage and basic fields
  TestValidator.equals(
    "subscription.member_user_id must equal authorized member id",
    subscription.member_user_id,
    authorized.id,
  );

  TestValidator.equals(
    "subscription.community_id must equal created community id",
    subscription.community_id,
    community.id,
  );

  TestValidator.equals(
    "embedded memberUser.id must equal subscription.member_user_id",
    subscription.memberUser.id,
    subscription.member_user_id,
  );

  TestValidator.equals(
    "embedded community.id must equal subscription.community_id",
    subscription.community.id,
    subscription.community_id,
  );

  TestValidator.predicate(
    "subscription.status should be a non-empty string",
    subscription.status.length > 0,
  );
}
