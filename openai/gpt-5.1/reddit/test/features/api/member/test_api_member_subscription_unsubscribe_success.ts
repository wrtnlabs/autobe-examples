import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate successful unsubscribe of a community subscription by its owning
 * member user.
 *
 * Business flow:
 *
 * 1. Register a new member user via /auth/memberUser/join and obtain an
 *    authenticated context.
 * 2. Create a new community as that member via
 *    /communityPlatform/memberUser/communities.
 * 3. Subscribe the member to the community via POST
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions.
 * 4. Unsubscribe by calling DELETE
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions/{subscriptionId}
 *    as the same member.
 * 5. Verify that the subscription was owned by this member and linked to the
 *    created community.
 * 6. Verify that a second unsubscribe attempt for the same subscription fails,
 *    implying the record is no longer active.
 */
export async function test_api_member_subscription_unsubscribe_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorizedMember = await api.functional.auth.memberUser.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorizedMember);

  const memberUserId = authorizedMember.id;

  // 2. Create a new community as this member
  const communityBody = {
    slug: `e2e-unsub-${RandomGenerator.alphabets(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a subscription linking the member user and community
  const subscriptionBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // Validate ownership and linkage
  TestValidator.equals(
    "subscription member id matches authorized member",
    subscription.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "subscription community id matches created community",
    subscription.community.id,
    community.id,
  );

  // 4. First unsubscribe attempt should succeed
  await api.functional.communityPlatform.memberUser.members.subscriptions.erase(
    connection,
    {
      memberUserId,
      subscriptionId: subscription.id,
    },
  );

  // 5. Second unsubscribe attempt should fail with an error (e.g., not found)
  await TestValidator.error(
    "second unsubscribe for same subscription should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.members.subscriptions.erase(
        connection,
        {
          memberUserId,
          subscriptionId: subscription.id,
        },
      );
    },
  );
}
