import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";

/**
 * Validate upsert of per-user feed preferences when member user has
 * subscriptions.
 *
 * Business workflow:
 *
 * 1. Register a new member user via POST /auth/memberUser/join and obtain an
 *    authenticated context (SDK attaches the access token onto the
 *    connection).
 * 2. As that member user, create a community via POST
 *    /communityPlatform/memberUser/communities using a valid
 *    ICommunityPlatformCommunity.ICreate payload.
 * 3. Still as the same member user, create a community subscription for that
 *    community using POST
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions.
 * 4. With at least one subscription in place, call PUT
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences
 *    with an ICommunityPlatformUserFeedPreferences.IUpdate payload to create or
 *    upsert the preference record.
 * 5. Call the same PUT endpoint again with different values to verify that the
 *    same preference row is updated (id and created_at remain stable while
 *    updated_at changes and the preference fields reflect the latest payload).
 *
 * Assertions:
 *
 * - All responses pass typia.assert() for their DTOs.
 * - Subscription is linked to the authenticated member user and created
 *   community.
 * - Feed preferences responses have memberUser.id equal to the authenticated user
 *   id and fields default_post_sort_mode, show_sensitive_content, and
 *   include_recommended_feeds matching the respective request bodies.
 * - Preference id and created_at remain the same across successive PUT calls,
 *   while updated_at differs, indicating upsert/update semantics with a single
 *   row per member user.
 */
export async function test_api_member_user_feed_preferences_upsert_with_existing_subscriptions(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const memberUserId = authorized.id;

  // 2. Create a community as the authenticated member user
  const communityBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: "public",
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a subscription for that member user to the community
  const subscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription.memberUser.id should match authorized member user",
    subscription.memberUser.id,
    memberUserId,
  );

  TestValidator.equals(
    "subscription.community.id should match created community",
    subscription.community.id,
    community.id,
  );

  // 4. First upsert of feed preferences
  const firstPrefsBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const firstPrefs: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.update(
      connection,
      {
        memberUserId,
        body: firstPrefsBody,
      },
    );
  typia.assert(firstPrefs);

  TestValidator.equals(
    "firstPrefs.memberUser.id should match authorized member user",
    firstPrefs.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "firstPrefs.default_post_sort_mode should reflect first request",
    firstPrefs.default_post_sort_mode,
    firstPrefsBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "firstPrefs.show_sensitive_content should reflect first request",
    firstPrefs.show_sensitive_content,
    firstPrefsBody.show_sensitive_content,
  );
  TestValidator.equals(
    "firstPrefs.include_recommended_feeds should reflect first request",
    firstPrefs.include_recommended_feeds,
    firstPrefsBody.include_recommended_feeds,
  );

  // 5. Second upsert (update existing preferences) with different values
  const secondPrefsBody = {
    default_post_sort_mode: "new",
    show_sensitive_content: true,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const secondPrefs: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.update(
      connection,
      {
        memberUserId,
        body: secondPrefsBody,
      },
    );
  typia.assert(secondPrefs);

  TestValidator.equals(
    "secondPrefs.memberUser.id should still match authorized member user",
    secondPrefs.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "secondPrefs.default_post_sort_mode should reflect second request",
    secondPrefs.default_post_sort_mode,
    secondPrefsBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "secondPrefs.show_sensitive_content should reflect second request",
    secondPrefs.show_sensitive_content,
    secondPrefsBody.show_sensitive_content,
  );
  TestValidator.equals(
    "secondPrefs.include_recommended_feeds should reflect second request",
    secondPrefs.include_recommended_feeds,
    secondPrefsBody.include_recommended_feeds,
  );

  // Ensure upsert semantics: same record (id, created_at) but updated_at changed
  TestValidator.equals(
    "feed preference id should remain the same across upserts",
    secondPrefs.id,
    firstPrefs.id,
  );
  TestValidator.equals(
    "created_at should remain stable across upserts",
    secondPrefs.created_at,
    firstPrefs.created_at,
  );
  TestValidator.notEquals(
    "updated_at should change after updating preferences",
    secondPrefs.updated_at,
    firstPrefs.updated_at,
  );
}
