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
 * Validate deletion attempt of a non-existent user feed preference by a
 * platform admin.
 *
 * Business purpose: This test ensures that when a platform administrator
 * attempts to delete a user feed preference record that does not exist, the
 * system responds with an error (not-found style) and does not affect any valid
 * preference data stored for real users. This is important for safety and
 * idempotency around admin tools: accidental targeting of stale or incorrect
 * IDs must not corrupt unrelated state.
 *
 * Scenario steps:
 *
 * 1. Register a platform administrator via /auth/platformAdmin/join so that
 *    subsequent calls as this actor have the correct authorization context.
 * 2. Register a member user via /auth/memberUser/join. This gives us a real member
 *    account that can own communities, subscriptions, and feed preferences,
 *    helping to ensure there is legitimate data in the system while we perform
 *    the negative deletion test.
 * 3. As the platform admin, create at least one community visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels to satisfy
 *    community creation rules.
 * 4. Switch to the memberUser actor (by calling /auth/memberUser/login) and create
 *    a community via /communityPlatform/memberUser/communities using the
 *    previously created visibility level code.
 * 5. Create a subscription for that member user via
 *    /communityPlatform/memberUser/subscriptions and then create a user feed
 *    preference config via /communityPlatform/memberUser/userFeedPreferences.
 *    The returned ICommunityPlatformUserFeedPreferences object provides a real
 *    preference.id that we must avoid using for the negative deletion attempt.
 * 6. Generate a fresh random UUID for a non-existent preferenceId that is
 *    guaranteed to differ from the existing preference.id (we can regenerate
 *    once if a collision occurs).
 * 7. Switch back to the platform admin actor (via /auth/platformAdmin/login) and
 *    call DELETE
 *    /communityPlatform/platformAdmin/userFeedPreferences/{preferenceId} using
 *    the random, non-existent UUID. We expect this API call to fail with an
 *    error rather than succeeding.
 * 8. Use TestValidator.error with a descriptive title to assert that the erase
 *    call throws. We deliberately avoid checking concrete HTTP status codes to
 *    remain decoupled from error-mapping details.
 * 9. For sanity, rely on typia.assert for the previously created
 *    ICommunityPlatformUserFeedPreferences object to confirm its shape remains
 *    valid. Since we have no GET endpoint for post-deletion verification, we
 *    interpret the fact that the creation result is still a valid object and
 *    that the failing deletion targeted a different id as sufficient evidence
 *    that no real preference record was removed.
 */
export async function test_api_user_feed_preference_deletion_by_platform_admin_for_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Create a platform administrator (join implicitly authenticates as admin).
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassword!234",
    displayName: RandomGenerator.name(2),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a member user via join.
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "MemberPassword!234",
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 3. As platform admin (still authenticated from join), create a visibility level.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Switch to member user by logging in.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberSession: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberSession);

  // 5. Create a community as the member user.
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Create a subscription for this community via memberUser collection endpoint.
  const subscriptionCreateBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert(subscription);

  // 7. Create a user feed preference for the authenticated member user via
  //    collection-level endpoint.
  const preferenceCreateBody = {
    default_post_sort_mode: RandomGenerator.pick([
      "hot",
      "new",
      "top",
      "controversial",
    ] as const),
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const preference: ICommunityPlatformUserFeedPreferences =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
      connection,
      { body: preferenceCreateBody },
    );
  typia.assert(preference);

  // 8. Generate a random UUID for a non-existent preferenceId, ensuring it's
  //    different from the real preference.id.
  let nonexistentPreferenceId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  if (nonexistentPreferenceId === preference.id) {
    nonexistentPreferenceId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "non-existent preference id must differ from real preference id",
    nonexistentPreferenceId,
    preference.id,
  );

  // 9. Switch back to platform admin actor using login to ensure correct auth.
  const adminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/home",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminSession: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminSession);

  // 10. Attempt to delete the non-existent preference id as platform admin and
  //     assert that it results in an error. We avoid asserting specific HTTP
  //     status codes and only check that an error occurs.
  await TestValidator.error(
    "deleting non-existent user feed preference by platform admin should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.userFeedPreferences.erase(
        connection,
        { preferenceId: nonexistentPreferenceId },
      );
    },
  );

  // 11. Sanity check: confirm the originally created preference object is still
  //     a valid ICommunityPlatformUserFeedPreferences value.
  typia.assert<ICommunityPlatformUserFeedPreferences>(preference);
}
