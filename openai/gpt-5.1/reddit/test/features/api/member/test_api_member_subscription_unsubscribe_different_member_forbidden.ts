import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate that one member user cannot unsubscribe a community subscription
 * owned by another member.
 *
 * Business flow implemented by this test:
 *
 * 1. Member A joins the platform (auth.memberUser.join).
 * 2. While authenticated as Member A, create a community
 *    (communityPlatform.memberUser.communities.create).
 * 3. Still as Member A, create a subscription for that community under Member A’s
 *    account (communityPlatform.memberUser.members.subscriptions.create).
 * 4. Member B joins the platform via a separate join() call, which switches the
 *    shared connection’s Authorization header to Member B.
 * 5. While authenticated as Member B, attempt to delete Member A’s subscription by
 *    calling communityPlatform.memberUser.members.subscriptions.erase with
 *    memberUserId = Member A’s id and subscriptionId = the subscription created
 *    in step 3.
 * 6. Assert that this unauthorized delete attempt fails (throws an error) and
 *    therefore the backend enforces strict ownership on subscription deletion.
 *
 * Due to the limited API surface available in this test, we treat the error on
 * the unauthorized DELETE as sufficient evidence that the subscription has not
 * been removed, instead of refetching it.
 */
export async function test_api_member_subscription_unsubscribe_different_member_forbidden(
  connection: api.IConnection,
) {
  // 1. Member A joins the platform and becomes the authenticated actor
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Create a community as Member A
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Sanity check: created community owner matches Member A
  TestValidator.equals(
    "community owner should be member A",
    community.owner_memberuser_id,
    memberA.id,
  );

  // 3. Create a subscription for Member A to this community
  const memberASubscriptionBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const memberASubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: memberA.id,
        body: memberASubscriptionBody,
      },
    );
  typia.assert(memberASubscription);

  // Sanity checks: subscription belongs to Member A and the target community
  TestValidator.equals(
    "subscription member should be member A",
    memberASubscription.memberUser.id,
    memberA.id,
  );
  TestValidator.equals(
    "subscription community should match created community",
    memberASubscription.community.id,
    community.id,
  );

  // 4. Member B joins, switching the connection to authenticate as Member B
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 5. While authenticated as Member B, attempt to delete Member A's subscription
  await TestValidator.error(
    "member B cannot delete member A's subscription",
    async () => {
      await api.functional.communityPlatform.memberUser.members.subscriptions.erase(
        connection,
        {
          memberUserId: memberA.id,
          subscriptionId: memberASubscription.id,
        },
      );
    },
  );
}
