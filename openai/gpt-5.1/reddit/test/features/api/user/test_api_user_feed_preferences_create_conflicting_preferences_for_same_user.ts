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
 * Validate behavior when creating conflicting user feed preferences for the
 * same member user.
 *
 * Business goal
 *
 * - Ensure that the user feed preference model behaves consistently when the same
 *   authenticated member user creates multiple preference records through both
 *   per-member and generic endpoints.
 * - Confirm that existing subscriptions and community visibility contexts do not
 *   prevent preference creation but provide a realistic environment.
 * - Observe whether the backend allows multiple preference rows or enforces
 *   uniqueness per member user, and assert accordingly without depending on
 *   specific HTTP status codes.
 *
 * End-to-end flow
 *
 * 1. Create a platformAdmin via /auth/platformAdmin/join; stay logged in as admin.
 * 2. As platformAdmin, create a visibility level via
 *    /communityPlatform/platformAdmin/communityVisibilityLevels.create.
 * 3. Create a memberUser via /auth/memberUser/join; this call leaves the
 *    connection authenticated as the member user.
 * 4. As the memberUser, create a community with the previously created visibility
 *    level using /communityPlatform/memberUser/communities.create.
 * 5. As the same memberUser, create a generic subscription using
 *    /communityPlatform/memberUser/subscriptions.create pointing to the
 *    community.
 * 6. Also create a memberUser-scoped subscription using
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/subscriptions.create
 *    to ensure the per-user subscription endpoint functions correctly.
 * 7. Initialize per-member feed preferences via
 *    /communityPlatform/memberUser/memberUsers/{memberUserId}/feedPreferences.create,
 *    using a concrete ICommunityPlatformUserFeedPreferences.ICreate payload.
 * 8. Then create a first standalone user feed preference via
 *    /communityPlatform/memberUser/userFeedPreferences.create using one
 *    configuration (e.g., default_post_sort_mode: "hot",
 *    show_sensitive_content: false, include_recommended_feeds: true).
 * 9. Attempt to create a second user feed preference for the same logical user via
 *    /communityPlatform/memberUser/userFeedPreferences.create again, but with
 *    different configuration (e.g., default_post_sort_mode: "new",
 *    show_sensitive_content: true, include_recommended_feeds: false).
 *
 * Assertion strategy
 *
 * - All successful API responses must be validated with typia.assert().
 * - For the first and (potential) second userFeedPreferences.create calls, use
 *   TestValidator.equals/notEquals and predicate assertions to verify:
 *
 *   - The first preference is associated with the expected member user summary.
 *   - If the second creation succeeds:
 *
 *       - Its id differs from the first one.
 *       - It is associated with the same member user summary (id match).
 *       - Its configuration fields differ according to the request bodies.
 *   - If the second creation fails:
 *
 *       - Wrap the call in TestValidator.error(...) to assert that an error is thrown
 *               (without inspecting HTTP status codes or error body details).
 * - Do not perform any type-mismatch or schema violation tests; always send valid
 *   DTO payloads.
 */
export async function test_api_user_feed_preferences_create_conflicting_preferences_for_same_user(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to create visibility levels.
  const platformAdminJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: platformAdminJoinInput,
    },
  );
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platform admin.
  const visibilityCreateBody = {
    code: `code_${RandomGenerator.alphabets(8)}`,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Join as a member user; this will set Authorization header to member user.
  const memberJoinInput = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized = await api.functional.auth.memberUser.join(
    connection,
    {
      body: memberJoinInput,
    },
  );
  typia.assert(memberAuthorized);

  const memberSummary: ICommunityPlatformMemberuser.ISummary = {
    id: memberAuthorized.id,
    username: memberAuthorized.username,
    display_name: memberAuthorized.displayName ?? undefined,
  };

  // 4. Create a community as the member user with the created visibility code.
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 5. Create a generic subscription to the community for the current member.
  const genericSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const genericSubscription =
    await api.functional.communityPlatform.memberUser.subscriptions.create(
      connection,
      { body: genericSubscriptionBody },
    );
  typia.assert(genericSubscription);

  TestValidator.equals(
    "generic subscription community should match created community",
    genericSubscription.community.id,
    community.id,
  );

  // 6. Create a memberUser-scoped subscription via memberUsers/{memberUserId}.
  const scopedSubscriptionBody = {
    community_id: community.id,
    status: "active",
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const scopedSubscription =
    await api.functional.communityPlatform.memberUser.memberUsers.subscriptions.create(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: scopedSubscriptionBody,
      },
    );
  typia.assert(scopedSubscription);

  TestValidator.equals(
    "scoped subscription member user should match authorized member",
    scopedSubscription.memberUser.id,
    memberAuthorized.id,
  );

  // 7. Initialize per-member feed preferences using memberUsers/{memberUserId}/feedPreferences.
  const perMemberPreferencesBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const perMemberPreferences =
    await api.functional.communityPlatform.memberUser.memberUsers.feedPreferences.create(
      connection,
      {
        memberUserId: memberAuthorized.id,
        body: perMemberPreferencesBody,
      },
    );
  typia.assert(perMemberPreferences);

  TestValidator.equals(
    "per-member preferences should reference same member",
    perMemberPreferences.memberUser.id,
    memberAuthorized.id,
  );

  // 8. Create first standalone user feed preferences via /userFeedPreferences.
  const firstStandaloneBody = {
    default_post_sort_mode: "hot",
    show_sensitive_content: false,
    include_recommended_feeds: true,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  const firstStandalone =
    await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
      connection,
      { body: firstStandaloneBody },
    );
  typia.assert(firstStandalone);

  TestValidator.equals(
    "first standalone preferences member user should match authorized member",
    firstStandalone.memberUser.id,
    memberAuthorized.id,
  );

  // 9. Attempt to create a second standalone preferences with a different configuration.
  const secondStandaloneBody = {
    default_post_sort_mode: "new",
    show_sensitive_content: true,
    include_recommended_feeds: false,
  } satisfies ICommunityPlatformUserFeedPreferences.ICreate;

  let secondCreationSucceeded = false;
  let secondStandalone: ICommunityPlatformUserFeedPreferences | null = null;

  try {
    const created =
      await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
        connection,
        { body: secondStandaloneBody },
      );
    typia.assert(created);
    secondStandalone = created;
    secondCreationSucceeded = true;
  } catch {
    secondCreationSucceeded = false;
  }

  if (secondCreationSucceeded && secondStandalone !== null) {
    // Multiple preferences allowed: verify same member user but different id/config.
    TestValidator.equals(
      "second preferences member user should match authorized member",
      secondStandalone.memberUser.id,
      memberAuthorized.id,
    );

    TestValidator.notEquals(
      "first and second standalone preferences should have different ids when both succeed",
      firstStandalone.id,
      secondStandalone.id,
    );

    TestValidator.notEquals(
      "default_post_sort_mode should differ between first and second preferences",
      firstStandalone.default_post_sort_mode,
      secondStandalone.default_post_sort_mode,
    );

    TestValidator.notEquals(
      "show_sensitive_content should differ between first and second preferences",
      firstStandalone.show_sensitive_content,
      secondStandalone.show_sensitive_content,
    );

    TestValidator.notEquals(
      "include_recommended_feeds should differ between first and second preferences",
      firstStandalone.include_recommended_feeds,
      secondStandalone.include_recommended_feeds,
    );
  } else {
    // Uniqueness enforced: expect subsequent creation to throw.
    await TestValidator.error(
      "second userFeedPreferences.create should fail when uniqueness is enforced",
      async () => {
        await api.functional.communityPlatform.memberUser.userFeedPreferences.create(
          connection,
          { body: secondStandaloneBody },
        );
      },
    );
  }
}
