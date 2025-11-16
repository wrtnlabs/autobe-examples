import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate not-found behavior when requesting a non-existent community
 * subscription.
 *
 * Business purpose: This test ensures that the memberUser subscription detail
 * endpoint correctly returns an HTTP 404 not-found error when the caller is
 * authenticated but supplies a subscriptionId that does not correspond to any
 * existing community_platform_community_subscriptions row. It also
 * double-checks that a legitimately created subscription is still retrievable,
 * so the not-found behavior is scoped only to unknown identifiers.
 *
 * Scenario steps:
 *
 * 1. Register and authenticate a new community platform member user via POST
 *    /auth/memberUser/join.
 * 2. Create a new community via POST /communityPlatform/memberUser/communities
 *    using ICommunityPlatformCommunity.ICreate.
 * 3. Create a valid subscription linking the authenticated member user to the
 *    created community via POST
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions.
 * 4. Generate a random UUID value for subscriptionId that is different from the
 *    actual subscription.id to represent a non-existent subscription.
 * 5. Call GET /communityPlatform/memberUser/subscriptions/{subscriptionId} using
 *    this non-existent id and the authenticated member user connection.
 * 6. Assert that the API responds with an HTTP 404 error using
 *    TestValidator.httpError.
 * 7. Finally, call GET /communityPlatform/memberUser/subscriptions/{realId} with
 *    the real subscription.id and assert that it returns a valid subscription
 *    object, confirming that the endpoint works normally for existing ids.
 */
export async function test_api_member_subscription_get_not_found_for_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new member user.
  const joinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a new community as the authenticated member user.
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(12),
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
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a valid subscription for the authenticated member user to this community.
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId: authorized.id,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // Sanity check: existing subscription can be retrieved successfully.
  const fetchedExisting: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.at(
      connection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(fetchedExisting);
  TestValidator.equals(
    "existing subscription id should match fetched subscription id",
    fetchedExisting.id,
    subscription.id,
  );

  // 4. Generate a non-existent subscriptionId (different from subscription.id).
  let nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonExistentId === subscription.id) {
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5-6. Call GET with non-existent id and expect 404 using TestValidator.httpError.
  await TestValidator.httpError(
    "requesting a non-existent subscription id should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.memberUser.subscriptions.at(
        connection,
        {
          subscriptionId: nonExistentId,
        },
      );
    },
  );

  // 7. Confirm again that the real id still works (idempotent check).
  const fetchedAgain: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.at(
      connection,
      {
        subscriptionId: subscription.id,
      },
    );
  typia.assert(fetchedAgain);
  TestValidator.equals(
    "real subscription remains retrievable after not-found checks",
    fetchedAgain.id,
    subscription.id,
  );
}
