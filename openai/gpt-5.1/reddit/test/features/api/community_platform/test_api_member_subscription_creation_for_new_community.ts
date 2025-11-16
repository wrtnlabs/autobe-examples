import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate member-scoped subscription creation to a newly created community.
 *
 * Business workflow:
 *
 * 1. Register and authenticate a new member user using /auth/memberUser/join.
 * 2. As that authenticated member, create a new community via
 *    /communityPlatform/memberUser/communities.
 * 3. Create a new subscription for that member to the created community via
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions.
 * 4. Attempt to create a duplicate subscription for the same member/community pair
 *    and assert the uniqueness / non-duplication behavior.
 *
 * Validations:
 *
 * - The subscription is created successfully for the first call.
 * - The subscription.memberUser.id matches the joined member user id used in the
 *   path parameter.
 * - The subscription.community.id and .slug match the created community.
 * - Is_active and receive_notifications in the response match the request.
 * - Created_at and updated_at are valid date-time strings and deleted_at is null
 *   or undefined.
 * - A second attempt to subscribe the same member to the same community results
 *   in an error, proving uniqueness enforcement for the (memberUser, community)
 *   pair.
 */
export async function test_api_member_subscription_creation_for_new_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create a new community as this member user.
  const communityBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Create a subscription for the joined member to the created community.
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: member.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // Validate memberUser linkage.
  TestValidator.equals(
    "subscription.memberUser.id matches joined member id",
    subscription.memberUser.id,
    member.id,
  );

  // Validate community summary linkage.
  TestValidator.equals(
    "subscription.community.id matches created community id",
    subscription.community.id,
    community.id,
  );
  TestValidator.equals(
    "subscription.community.slug matches created community slug",
    subscription.community.slug,
    community.slug,
  );

  // Validate flags match the request body.
  TestValidator.equals(
    "subscription.is_active reflects request body",
    subscription.is_active,
    subscriptionCreateBody.is_active,
  );
  TestValidator.equals(
    "subscription.receive_notifications reflects request body",
    subscription.receive_notifications,
    subscriptionCreateBody.receive_notifications,
  );

  // Timestamps and deletion state are already type-validated by typia.assert.
  TestValidator.predicate(
    "subscription.deleted_at is null or undefined for new subscription",
    subscription.deleted_at === null || subscription.deleted_at === undefined,
  );

  // 4. Attempt to create a duplicate subscription for the same member/community.
  await TestValidator.error(
    "duplicate subscription creation for same member and community should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.members.subscriptions.create(
        connection,
        {
          memberUserId: member.id,
          body: subscriptionCreateBody,
        },
      );
    },
  );
}
