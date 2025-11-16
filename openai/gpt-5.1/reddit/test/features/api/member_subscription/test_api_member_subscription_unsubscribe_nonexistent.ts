import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate unsubscribe behavior for non-existent member subscriptions.
 *
 * Business goal: Ensure that when a member user attempts to delete a community
 * subscription that has already been removed (or never existed), the API
 * clearly signals a not-found style error instead of silently succeeding, and
 * that this attempt does not affect other subscription records.
 *
 * Scenario steps:
 *
 * 1. Register a new community platform member user via /auth/memberUser/join.
 * 2. Create a new community via /communityPlatform/memberUser/communities.
 * 3. Subscribe the member to the created community via
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions.
 * 4. Optionally create a second subscription to ensure other subscriptions are
 *    unaffected (we'll rely on the fact that no API operation touches it).
 * 5. Delete the first subscription once using DELETE
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions/{subscriptionId}.
 * 6. Attempt to delete the same subscription again, expecting an error.
 *
 * Assertions:
 *
 * - First DELETE call completes without throwing an error.
 * - Second DELETE call throws an error, asserted with TestValidator.error,
 *   confirming that the backend treats already-removed subscriptions as
 *   not-found rather than idempotent success.
 * - No assumptions are made about other subscriptions beyond the fact that we do
 *   not issue any operations that could remove them.
 */
export async function test_api_member_subscription_unsubscribe_nonexistent(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain authorized context.
  const joinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 2. Create a new community.
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(16),
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

  const communityId = community.id;

  // 3. Create a subscription for that member to the created community.
  const subscriptionBody = {
    community_platform_community_id: communityId,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  const subscriptionId = subscription.id;

  // 4. Optionally, create a second subscription to show other records exist.
  const secondCommunityBody = {
    slug: RandomGenerator.alphaNumeric(18),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const secondCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: secondCommunityBody,
      },
    );
  typia.assert(secondCommunity);

  const secondSubscriptionBody = {
    community_platform_community_id: secondCommunity.id,
    is_active: true,
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const secondSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: secondSubscriptionBody,
      },
    );
  typia.assert(secondSubscription);

  // 5. First delete should succeed without error.
  await api.functional.communityPlatform.memberUser.members.subscriptions.erase(
    connection,
    {
      memberUserId,
      subscriptionId,
    },
  );

  // 6. Second delete on the same subscription should fail with an error.
  await TestValidator.error(
    "deleting already-removed subscription should fail",
    async () => {
      await api.functional.communityPlatform.memberUser.members.subscriptions.erase(
        connection,
        {
          memberUserId,
          subscriptionId,
        },
      );
    },
  );

  // 7. Sanity check: ensure the second subscription id is different and
  // unaffected (we only assert inequality locally, since we cannot re-fetch it).
  TestValidator.notEquals(
    "second subscription id should differ from first",
    secondSubscription.id,
    subscriptionId,
  );
}
