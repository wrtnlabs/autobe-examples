import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import type { ICommunityPlatformProfilePreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfilePreference";

/**
 * Validate admin ability to update any user's profile preferences.
 *
 * 1. Register a new admin account (via /auth/admin/join).
 * 2. Register a new member account (via /auth/member/join).
 * 3. Admin assigns a badge to the created member's profile (profileId guaranteed).
 * 4. As admin, update member's profile preferences several times:
 *
 *    - Valid: change theme, language (using plausible values), privacy &
 *         notification flags.
 *    - Assert updates are accepted and reflected.
 * 5. Update again with different (also valid) settings, verify audit (updated_at
 *    changes).
 * 6. Try update with forbidden/invalid settings (e.g. theme = "alien", language =
 *    "!!!").
 *
 *    - Assert error is thrown for each invalid input.
 * 7. Try to update a non-existent profileId, verify error (not found).
 */
export async function test_api_profile_preferences_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    },
  });
  typia.assert(admin);

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    },
  });
  typia.assert(member);

  // 3. Admin creates a profile badge for the member, which provides valid profileId
  const profileId = member.id as string & tags.Format<"uuid">; // assuming profileId == member.id
  const badge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId,
        body: {
          community_platform_profile_id: profileId,
          badge_type: "achiever",
          badge_name: RandomGenerator.name(1),
          issued_at: new Date().toISOString(),
        },
      },
    );
  typia.assert(badge);

  // 4. First update: valid preferences
  const prefsBody1 = {
    language: "en",
    theme: RandomGenerator.pick(["light", "dark"] as const),
    show_email: false,
    show_badges: true,
    allow_messages_from_nonfollowers: true,
    notification_settings: JSON.stringify({ email: true, push: false }),
  } satisfies ICommunityPlatformProfilePreference.IUpdate;
  const pref1 =
    await api.functional.communityPlatform.admin.profiles.preferences.update(
      connection,
      {
        profileId,
        body: prefsBody1,
      },
    );
  typia.assert(pref1);
  TestValidator.equals(
    "profile preferences were updated",
    pref1.language,
    prefsBody1.language,
  );
  TestValidator.equals(
    "profile preferences theme updated",
    pref1.theme,
    prefsBody1.theme,
  );
  TestValidator.equals(
    "profile preferences privacy updated",
    pref1.show_email,
    prefsBody1.show_email,
  );
  TestValidator.equals(
    "profile preferences show_badges updated",
    pref1.show_badges,
    prefsBody1.show_badges,
  );
  TestValidator.equals(
    "profile preferences allow_messages_from_nonfollowers updated",
    pref1.allow_messages_from_nonfollowers,
    prefsBody1.allow_messages_from_nonfollowers,
  );
  TestValidator.equals(
    "profile notification_settings updated",
    pref1.notification_settings,
    prefsBody1.notification_settings,
  );

  // 5. Second update: different valid values, and assertion on updated_at audit
  const prevUpdatedAt = pref1.updated_at;
  const prefsBody2 = {
    language: "ko",
    theme: RandomGenerator.pick(["light", "dark"] as const),
    show_email: true,
    show_badges: false,
    allow_messages_from_nonfollowers: false,
    notification_settings: JSON.stringify({
      email: false,
      push: true,
      browser: true,
    }),
  } satisfies ICommunityPlatformProfilePreference.IUpdate;
  const pref2 =
    await api.functional.communityPlatform.admin.profiles.preferences.update(
      connection,
      {
        profileId,
        body: prefsBody2,
      },
    );
  typia.assert(pref2);
  TestValidator.equals(
    "profile preferences updated language",
    pref2.language,
    prefsBody2.language,
  );
  TestValidator.equals(
    "profile preferences updated theme",
    pref2.theme,
    prefsBody2.theme,
  );
  TestValidator.equals(
    "profile preferences updated privacy",
    pref2.show_email,
    prefsBody2.show_email,
  );
  TestValidator.equals(
    "profile preferences updated show_badges",
    pref2.show_badges,
    prefsBody2.show_badges,
  );
  TestValidator.equals(
    "profile preferences updated allow_messages_from_nonfollowers",
    pref2.allow_messages_from_nonfollowers,
    prefsBody2.allow_messages_from_nonfollowers,
  );
  TestValidator.equals(
    "profile notification_settings re-updated",
    pref2.notification_settings,
    prefsBody2.notification_settings,
  );
  TestValidator.notEquals(
    "updated_at must change after update",
    pref2.updated_at,
    prevUpdatedAt,
  );

  // 6. Invalid field test: forbidden theme value
  await TestValidator.error(
    "forbidden theme value should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.profiles.preferences.update(
        connection,
        {
          profileId,
          body: {
            theme: "alien",
          } satisfies ICommunityPlatformProfilePreference.IUpdate,
        },
      );
    },
  );
  // Invalid field test: ill-formed language code
  await TestValidator.error("invalid language should be rejected", async () => {
    await api.functional.communityPlatform.admin.profiles.preferences.update(
      connection,
      {
        profileId,
        body: {
          language: "!!!",
        } satisfies ICommunityPlatformProfilePreference.IUpdate,
      },
    );
  });
  // Invalid field test: notification_settings bad JSON
  await TestValidator.error(
    "invalid notification_settings format should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.profiles.preferences.update(
        connection,
        {
          profileId,
          body: {
            notification_settings: "notjson:{'bad':1}",
          } satisfies ICommunityPlatformProfilePreference.IUpdate,
        },
      );
    },
  );

  // 7. Update on non-existent profileId
  await TestValidator.error(
    "update with non-existent profileId should be rejected",
    async () => {
      await api.functional.communityPlatform.admin.profiles.preferences.update(
        connection,
        {
          profileId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            language: "en",
          },
        },
      );
    },
  );
}
