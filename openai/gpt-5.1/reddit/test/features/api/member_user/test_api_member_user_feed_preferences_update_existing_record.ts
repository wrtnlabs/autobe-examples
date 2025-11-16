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
 * Validate updating existing user feed preferences for a member user.
 *
 * Business goal: Ensure that when a member user already has a feed preferences
 * record, calling PUT
 * /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences
 * updates that existing record instead of creating a duplicate, and that the
 * updated values are persisted correctly while the association to the member
 * user remains stable.
 *
 * Scenario steps:
 *
 * 1. Register a new member user via /auth/memberUser/join to get an authenticated
 *    memberUser and its id.
 * 2. Create a community via /communityPlatform/memberUser/communities so there is
 *    a realistic community to subscribe to.
 * 3. Create a subscription for the member user to that community via
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions.
 * 4. Create an initial user feed preferences record for the member user via POST
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences
 *    with explicit values for:
 *
 *    - Default_post_sort_mode
 *    - Show_sensitive_content
 *    - Include_recommended_feeds
 * 5. Update that preferences record via PUT
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences
 *    using a different combination of the same fields.
 * 6. Validate that:
 *
 *    - The id of the preferences record is the same before and after update (update,
 *         not create).
 *    - The updated fields reflect the new values.
 *    - Created_at remains unchanged, updated_at is later than created_at.
 *    - The memberUser association continues to reference the same member user id.
 */
export async function test_api_member_user_feed_preferences_update_existing_record(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const joinRequestBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password123!",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(authorized);

  const memberUserId = authorized.id;

  // 2. Create a community as this member user
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    // primaryTagIds omitted for simplicity
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a subscription for this member user to the created community
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  TestValidator.equals(
    "subscription memberUser id should equal authorized member user id",
    subscription.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "subscription community id should equal created community id",
    subscription.community.id,
    community.id,
  );

  // 4. Create initial feed preferences record via POST
  const initialPreferencesCreateBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const initialPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: initialPreferencesCreateBody,
      },
    );
  typia.assert(initialPreferences);

  TestValidator.equals(
    "initial preferences memberUser id should equal authorized member user id",
    initialPreferences.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "initial default_post_sort_mode should be 'hot'",
    initialPreferences.default_post_sort_mode,
    initialPreferencesCreateBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "initial show_sensitive_content should be false",
    initialPreferences.show_sensitive_content,
    initialPreferencesCreateBody.show_sensitive_content,
  );
  TestValidator.equals(
    "initial include_recommended_feeds should be true",
    initialPreferences.include_recommended_feeds,
    initialPreferencesCreateBody.include_recommended_feeds,
  );

  // 5. Update feed preferences via PUT with different values
  const updatePreferencesBody = {
    default_post_sort_mode: "new",
    show_sensitive_content: true,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.IUpdate;

  const updatedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.update(
      connection,
      {
        memberUserId,
        body: updatePreferencesBody,
      },
    );
  typia.assert(updatedPreferences);

  // 6. Validate that id is stable (update, not create)
  TestValidator.equals(
    "preferences id should remain the same after update",
    updatedPreferences.id,
    initialPreferences.id,
  );

  // Validate memberUser association stability
  TestValidator.equals(
    "updated preferences memberUser id should equal initial memberUser id",
    updatedPreferences.memberUser.id,
    initialPreferences.memberUser.id,
  );
  TestValidator.equals(
    "updated preferences memberUser id should equal authorized member user id",
    updatedPreferences.memberUser.id,
    memberUserId,
  );

  // Validate field value changes
  TestValidator.equals(
    "updated default_post_sort_mode should be 'new'",
    updatedPreferences.default_post_sort_mode,
    updatePreferencesBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "updated show_sensitive_content should be true",
    updatedPreferences.show_sensitive_content,
    updatePreferencesBody.show_sensitive_content,
  );
  TestValidator.equals(
    "updated include_recommended_feeds should be false",
    updatedPreferences.include_recommended_feeds,
    updatePreferencesBody.include_recommended_feeds,
  );

  // Validate timestamps: created_at unchanged, updated_at later than created_at
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedPreferences.created_at,
    initialPreferences.created_at,
  );

  // Compare as Date objects for strict ordering
  const createdAtDate = new Date(initialPreferences.created_at);
  const updatedAtDate = new Date(updatedPreferences.updated_at);

  TestValidator.predicate(
    "updated_at should be later than created_at",
    updatedAtDate.getTime() > createdAtDate.getTime(),
  );
}
