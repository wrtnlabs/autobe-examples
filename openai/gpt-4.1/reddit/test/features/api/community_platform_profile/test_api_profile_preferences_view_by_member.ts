import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import type { ICommunityPlatformProfilePreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfilePreferences";

/**
 * Validate that a registered member can view their own profile preferences
 * (appearance, privacy, messaging, notification, etc) immediately after joining
 * and after a badge assignment. Also validates ownership access restrictions
 * and completeness of preference fields.
 *
 * Steps:
 *
 * 1. Register as a new member using a unique email and random password
 * 2. Extract 'id' from the join response as 'profileId' for future API calls
 * 3. Assign a badge to this profile via the admin badge assignment API (minimal
 *    required fields)
 * 4. Retrieve this member profile's preferences as the logged-in user
 * 5. Assert returned preferences are type-valid (typia.assert), include
 *    required/default fields (like badge/email visibility, language/theme
 *    fields), and owner-only access is enforced
 * 6. Try retrieving preferences for an unrelated (random/invalid) profileId and
 *    expect error/denied
 */
export async function test_api_profile_preferences_view_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration
  const memberInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformMember.ICreate;
  const member = await api.functional.auth.member.join(connection, {
    body: memberInput,
  });
  typia.assert(member);

  // 2. Extract profileId from the join response
  const profileId = member.id;

  // 3. Assign a badge to this member's profile (minimal required fields)
  const badgeInput = {
    community_platform_profile_id: profileId,
    badge_type: RandomGenerator.name(1),
    badge_name: RandomGenerator.name(1),
  } satisfies ICommunityPlatformProfileBadge.ICreate;
  const badge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId,
        body: badgeInput,
      },
    );
  typia.assert(badge);
  TestValidator.equals(
    "badge assigned to correct profile",
    badge.community_platform_profile_id,
    profileId,
  );

  // 4. Retrieve profile preferences as the authenticated member
  const preferences =
    await api.functional.communityPlatform.member.profiles.preferences.at(
      connection,
      { profileId },
    );
  typia.assert(preferences);
  TestValidator.equals(
    "preferences belong to correct profile",
    preferences.community_platform_profile_id,
    profileId,
  );
  TestValidator.predicate(
    "show_email is boolean",
    typeof preferences.show_email === "boolean",
  );
  TestValidator.predicate(
    "show_badges is boolean",
    typeof preferences.show_badges === "boolean",
  );
  TestValidator.predicate(
    "allow_messages_from_nonfollowers is boolean",
    typeof preferences.allow_messages_from_nonfollowers === "boolean",
  );

  // Optional/default fields are present or null/undefined
  TestValidator.predicate(
    "language is string/null/undefined",
    preferences.language === null ||
      preferences.language === undefined ||
      typeof preferences.language === "string",
  );
  TestValidator.predicate(
    "theme is string/null/undefined",
    preferences.theme === null ||
      preferences.theme === undefined ||
      typeof preferences.theme === "string",
  );
  TestValidator.predicate(
    "notification_settings is string/null/undefined",
    preferences.notification_settings === null ||
      preferences.notification_settings === undefined ||
      typeof preferences.notification_settings === "string",
  );

  // 5. Access denied for unrelated (random) profileId
  const fakeProfileId = typia.random<string & tags.Format<"uuid">>();
  if (fakeProfileId !== profileId) {
    await TestValidator.error(
      "cannot access preferences of unrelated profile",
      async () => {
        await api.functional.communityPlatform.member.profiles.preferences.at(
          connection,
          { profileId: fakeProfileId },
        );
      },
    );
  }
}
