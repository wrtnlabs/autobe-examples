import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate not-found behavior when requesting a subscription detail with an
 * invalid subscriptionId for a legitimate member user.
 *
 * Business context:
 *
 * - A member user can subscribe to communities, creating
 *   community_platform_community_subscriptions rows.
 * - The detail endpoint GET
 *   /communityPlatform/memberUser/members/{memberUserId}/subscriptions/{subscriptionId}
 *   must only return a subscription that belongs to the specified member user.
 * - When a client requests a subscriptionId that does not exist (or does not
 *   belong to that member), the platform should respond with a not-found style
 *   HttpError (typically 404).
 *
 * Steps:
 *
 * 1. Register and authenticate a member user via /auth/memberUser/join.
 * 2. Create a community as that member via POST
 *    /communityPlatform/memberUser/communities.
 * 3. Create a valid subscription for that member and community via POST
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions.
 * 4. Generate a random UUID that differs from the real subscription.id and attempt
 *    to GET the subscription detail using that non-existent id.
 * 5. Assert that an HttpError with 404 status is thrown for the invalid id.
 * 6. Finally, re-fetch the real subscription detail and assert it still exists and
 *    matches the created subscription, proving that the not-found request did
 *    not affect normal data.
 */
export async function test_api_member_subscription_detail_not_found_for_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(authorized);

  const memberUserId: string & tags.Format<"uuid"> = authorized.id;

  // 2. Create a community as that member
  const communityCreateBody = {
    slug: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 3,
      wordMax: 10,
    }),
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
  typia.assert<ICommunityPlatformCommunity>(community);

  // 3. Create a valid subscription for that member and community
  const subscriptionCreateBody = {
    community_platform_community_id: community.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(subscription);

  // 4. Generate a random UUID that differs from the real subscription.id
  let invalidSubscriptionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (invalidSubscriptionId === subscription.id) {
    invalidSubscriptionId = typia.random<string & tags.Format<"uuid">>();
  }

  // 5. Attempt to GET detail for the invalid subscription id and
  //    expect a 404 not-found HttpError
  await TestValidator.httpError(
    "member subscription detail should return 404 for non-existent subscriptionId",
    404,
    async () => {
      await api.functional.communityPlatform.memberUser.members.subscriptions.at(
        connection,
        {
          memberUserId,
          subscriptionId: invalidSubscriptionId,
        },
      );
    },
  );

  // 6. Re-fetch the real subscription to ensure it is unaffected
  const fetched: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.at(
      connection,
      {
        memberUserId,
        subscriptionId: subscription.id,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(fetched);

  // Basic equality checks on key identifiers
  TestValidator.equals(
    "fetched subscription id matches created subscription id",
    fetched.id,
    subscription.id,
  );
  TestValidator.equals(
    "fetched memberUser id matches authorized member user",
    fetched.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "fetched community id matches created community",
    fetched.community.id,
    community.id,
  );
}
