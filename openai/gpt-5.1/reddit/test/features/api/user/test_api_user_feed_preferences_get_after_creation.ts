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
 * Validate retrieval of a user feed preference record after creation.
 *
 * Business context: A member user can configure how their feeds are constructed
 * (default sort mode, whether to show sensitive content, and whether to include
 * recommended/default feeds). The platform exposes two creation surfaces for
 * these preferences:
 *
 * - A memberUser-scoped endpoint that upserts preferences for a specific member
 *   user.
 * - A collection-level endpoint that creates standalone preference records and
 *   returns their IDs.
 *
 * This test verifies that, after authenticating as a member user and creating a
 * complete context (visibility level, community, subscriptions, and feed
 * preferences), a specific user feed preference record created via POST
 * /communityPlatform/memberUser/userFeedPreferences can be retrieved by its ID
 * through GET /communityPlatform/memberUser/userFeedPreferences/{preferenceId},
 * and that the retrieved data matches the creation input and is associated with
 * the same member user.
 *
 * Steps:
 *
 * 1. Register a new member user via auth.memberUser.join.
 * 2. Register a new platform admin via auth.platformAdmin.join.
 * 3. As platform admin, create a community visibility level.
 * 4. Switch back to the member user via auth.memberUser.login.
 * 5. Create a community referencing the created visibility level.
 * 6. Create a generic subscription to the community.
 * 7. Create a memberUser-scoped subscription for the same community.
 * 8. Upsert memberUser-scoped feed preferences.
 * 9. Create a standalone user feed preference record via the collection-level
 *    userFeedPreferences.create endpoint and capture its ID.
 * 10. Retrieve the preference by ID using userFeedPreferences.at.
 * 11. Assert that the retrieved record matches the created one, including owner
 *     (memberUser summary) and preference fields.
 */
export async function test_api_user_feed_preferences_get_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join)
  const memberJoinPassword = "P@ssw0rd-" + RandomGenerator.alphaNumeric(8);
  const memberJoinRequest = {
    username: `user_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: memberJoinPassword,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinRequest,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  const memberUserId = memberAuthorized.id;
  const memberUsername = memberAuthorized.username;
  const memberEmail = memberAuthorized.email;

  // 2. Register a new platform admin
  const adminPassword = "Adm1n-" + RandomGenerator.alphaNumeric(8);
  const platformAdminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@admin.example.com`,
    password: adminPassword,
    displayName: RandomGenerator.name(),
    ip: "192.0.2.10",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 3. As platform admin, create a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibility);
  TestValidator.equals(
    "created visibility level code matches request",
    visibility.code,
    visibilityCode,
  );

  // 4. Switch back to member user using login
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberJoinPassword,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);
  TestValidator.equals(
    "logged-in member id matches joined member id",
    memberLogin.id,
    memberUserId,
  );

  // 5. Create a community as the member user
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    // primaryTagIds omitted (optional) because we have no tag master data
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier matches request",
    community.identifier,
    communityIdentifier,
  );

  // 6. Create a generic subscription for the member user
  const genericSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: genericSubscriptionBody },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(genericSubscription);
  TestValidator.equals(
    "generic subscription community_id matches created community",
    genericSubscription.community_id,
    community.id,
  );

  // 7. Create a memberUser-scoped subscription for the same community
  const scopedSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const scopedSubscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberUserId,
        body: scopedSubscriptionBody,
      },
    );
  typia.assert<ICommunityPlatformCommunitySubscription>(scopedSubscription);
  TestValidator.equals(
    "scoped subscription member user id matches member",
    scopedSubscription.member_user_id,
    memberUserId,
  );

  // 8. Upsert memberUser-scoped feed preferences
  const initialPreferencesCreateBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const initialPreferences: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberUserId,
        body: initialPreferencesCreateBody,
      },
    );
  typia.assert<ICommunityPlatformUserFeedPreferences>(initialPreferences);
  TestValidator.equals(
    "initial preferences owner id matches member",
    initialPreferences.memberUser.id,
    memberUserId,
  );

  // 9. Create a standalone user feed preference record via collection-level create
  const standalonePreferencesCreateBody = {
    default_post_sort_mode: "new",
    show_sensitive_content: true,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const createdPreference: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
      connection,
      { body: standalonePreferencesCreateBody },
    );
  typia.assert<ICommunityPlatformUserFeedPreferences>(createdPreference);

  const createdPreferenceId = createdPreference.id;
  TestValidator.equals(
    "created preference owner id matches member",
    createdPreference.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "created preference default_post_sort_mode matches request",
    createdPreference.default_post_sort_mode,
    standalonePreferencesCreateBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "created preference show_sensitive_content matches request",
    createdPreference.show_sensitive_content,
    standalonePreferencesCreateBody.show_sensitive_content,
  );
  TestValidator.equals(
    "created preference include_recommended_feeds matches request",
    createdPreference.include_recommended_feeds,
    standalonePreferencesCreateBody.include_recommended_feeds,
  );

  // 10. Retrieve the preference by ID using userFeedPreferences.at
  const fetchedPreference: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.at(
      connection,
      { preferenceId: createdPreferenceId },
    );
  typia.assert<ICommunityPlatformUserFeedPreferences>(fetchedPreference);

  // 11. Assertions comparing fetched vs created preference
  TestValidator.equals(
    "fetched preference id matches created preference id",
    fetchedPreference.id,
    createdPreferenceId,
  );
  TestValidator.equals(
    "fetched preference owner id matches member",
    fetchedPreference.memberUser.id,
    memberUserId,
  );
  TestValidator.equals(
    "fetched preference owner username matches joined username",
    fetchedPreference.memberUser.username,
    memberUsername,
  );
  TestValidator.equals(
    "fetched preference default_post_sort_mode equals created",
    fetchedPreference.default_post_sort_mode,
    standalonePreferencesCreateBody.default_post_sort_mode,
  );
  TestValidator.equals(
    "fetched preference show_sensitive_content equals created",
    fetchedPreference.show_sensitive_content,
    standalonePreferencesCreateBody.show_sensitive_content,
  );
  TestValidator.equals(
    "fetched preference include_recommended_feeds equals created",
    fetchedPreference.include_recommended_feeds,
    standalonePreferencesCreateBody.include_recommended_feeds,
  );
}
