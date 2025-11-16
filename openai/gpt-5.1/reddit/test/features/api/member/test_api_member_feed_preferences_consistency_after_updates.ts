import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserFeedPreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserFeedPreferences";

/**
 * Validate that member user feed preferences retrieved via PATCH
 * /communityPlatform/memberUser/userFeedPreferences always reflect the latest
 * configuration written through the memberUser-scoped feedPreferences upsert
 * endpoint.
 *
 * Business scenario:
 *
 * 1. A platform admin defines at least one visibility level that members can use
 *    when creating communities.
 * 2. A member user joins the platform (self-registration) and becomes
 *    authenticated.
 * 3. Using the member account, a community visibility level is referenced to
 *    create a community, and the same member subscribes to that community to
 *    approximate realistic feed conditions.
 * 4. The member user’s feed preferences are created/overwritten via POST
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences
 *    with an initial configuration.
 * 5. PATCH /communityPlatform/memberUser/userFeedPreferences is used to retrieve
 *    the effective preferences for the current member session and is validated
 *    to match the initial configuration.
 * 6. The feed preferences are updated again using the same POST
 *    memberUsers/{memberUserId}/feedPreferences endpoint but with different
 *    values to simulate an upsert/overwrite.
 * 7. PATCH /communityPlatform/memberUser/userFeedPreferences is called again, and
 *    the response is checked to match the updated configuration, while still
 *    being associated with the same member user.
 */
export async function test_api_member_feed_preferences_consistency_after_updates(
  connection: api.IConnection,
) {
  // 1. Platform admin registration and authentication
  const platformAdminJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(2),
        ip: undefined,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdminJoin);

  // At this point, SDK has already stored platformAdmin token into connection.

  // 2. Create a visibility level used later by communities
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `public-${RandomGenerator.alphabets(8)}`,
          name: "Public",
          description: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user joins and authenticates
  const memberEmail: string = typia.random<string & tags.Format<"email">>();

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(16),
        ip: null,
        href: "https://app.example.com/join",
        referrer: "https://app.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // Ensure we know the member user id for feedPreferences path parameter
  const memberUserId: string & tags.Format<"uuid"> = memberJoin.id;

  // 4. Member creates a community using the defined visibility level
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphabets(6)}`,
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 10,
          }),
          description: RandomGenerator.paragraph({
            sentences: 6,
            wordMin: 3,
            wordMax: 10,
          }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Member subscribes to the created community
  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      {
        body: {
          community_id: community.id,
          status: "active",
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "subscription member id should match joining member",
    subscription.member_user_id,
    memberUserId,
  );
  TestValidator.equals(
    "subscription community id should match created community",
    subscription.community_id,
    community.id,
  );

  // 6. Initial feed preference creation for the member user
  const initialPreferencesInput = {
    default_post_sort_mode: "new",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const createdInitialPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: initialPreferencesInput,
      },
    );
  typia.assert(createdInitialPreferences);

  TestValidator.equals(
    "created initial preferences should belong to member user",
    createdInitialPreferences.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "created initial default_post_sort_mode matches input",
    createdInitialPreferences.default_post_sort_mode,
    initialPreferencesInput.default_post_sort_mode,
  );
  TestValidator.equals(
    "created initial show_sensitive_content matches input",
    createdInitialPreferences.show_sensitive_content,
    initialPreferencesInput.show_sensitive_content,
  );
  TestValidator.equals(
    "created initial include_recommended_feeds matches input",
    createdInitialPreferences.include_recommended_feeds,
    initialPreferencesInput.include_recommended_feeds,
  );

  // 7. Retrieve preferences via PATCH userFeedPreferences and validate
  const firstRetrievedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.index(
      connection,
      {
        body: {
          page: undefined,
          limit: undefined,
        } satisfies ICommunityPlatformUserFeedPreferences.IRequest,
      },
    );
  typia.assert(firstRetrievedPreferences);

  TestValidator.equals(
    "first retrieval preferences belong to same member user",
    firstRetrievedPreferences.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "first retrieval default_post_sort_mode matches initial",
    firstRetrievedPreferences.default_post_sort_mode,
    initialPreferencesInput.default_post_sort_mode,
  );
  TestValidator.equals(
    "first retrieval show_sensitive_content matches initial",
    firstRetrievedPreferences.show_sensitive_content,
    initialPreferencesInput.show_sensitive_content,
  );
  TestValidator.equals(
    "first retrieval include_recommended_feeds matches initial",
    firstRetrievedPreferences.include_recommended_feeds,
    initialPreferencesInput.include_recommended_feeds,
  );

  // 8. Update feed preferences (upsert/overwrite) with new configuration
  const updatedPreferencesInput = {
    default_post_sort_mode: "top",
    show_sensitive_content: true,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const updatedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId,
        body: updatedPreferencesInput,
      },
    );
  typia.assert(updatedPreferences);

  TestValidator.equals(
    "updated preferences still belong to same member user",
    updatedPreferences.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "updated default_post_sort_mode matches new input",
    updatedPreferences.default_post_sort_mode,
    updatedPreferencesInput.default_post_sort_mode,
  );
  TestValidator.equals(
    "updated show_sensitive_content matches new input",
    updatedPreferences.show_sensitive_content,
    updatedPreferencesInput.show_sensitive_content,
  );
  TestValidator.equals(
    "updated include_recommended_feeds matches new input",
    updatedPreferences.include_recommended_feeds,
    updatedPreferencesInput.include_recommended_feeds,
  );

  // 9. Retrieve preferences again via PATCH userFeedPreferences
  const secondRetrievedPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.index(
      connection,
      {
        body: {
          page: undefined,
          limit: undefined,
        } satisfies ICommunityPlatformUserFeedPreferences.IRequest,
      },
    );
  typia.assert(secondRetrievedPreferences);

  // 10. Final validations: latest configuration is reflected
  TestValidator.equals(
    "second retrieval preferences belong to same member user",
    secondRetrievedPreferences.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "second retrieval default_post_sort_mode reflects latest update",
    secondRetrievedPreferences.default_post_sort_mode,
    updatedPreferencesInput.default_post_sort_mode,
  );
  TestValidator.equals(
    "second retrieval show_sensitive_content reflects latest update",
    secondRetrievedPreferences.show_sensitive_content,
    updatedPreferencesInput.show_sensitive_content,
  );
  TestValidator.equals(
    "second retrieval include_recommended_feeds reflects latest update",
    secondRetrievedPreferences.include_recommended_feeds,
    updatedPreferencesInput.include_recommended_feeds,
  );
}
