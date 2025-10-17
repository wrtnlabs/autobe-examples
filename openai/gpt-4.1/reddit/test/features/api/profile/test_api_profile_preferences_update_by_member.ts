import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import type { ICommunityPlatformProfilePreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfilePreference";

/**
 * Test that a member user can update their profile preferences.
 *
 * 1. Register a new member user and log in.
 * 2. Create a badge to ensure profileId exists (prerequisite for preference
 *    update).
 * 3. Update profile preferences with valid data as the profile owner.
 * 4. Validate updated preferences by reading result.
 * 5. Update preferences with each valid theme, language, and bool toggle.
 * 6. Test invalid value for a field, expect error.
 * 7. Test forbidden: try changing another user's preferences, expect error.
 * 8. Test not found: try with random non-existent profileId, expect error.
 */
export async function test_api_profile_preferences_update_by_member(
  connection: api.IConnection,
) {
  // 1. Register as a member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a badge for their profile (makes sure profileId exists for preference editing)
  const badge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: member.id satisfies string as string,
        body: {
          community_platform_profile_id: member.id,
          badge_type: RandomGenerator.name(1),
          badge_name: RandomGenerator.name(1),
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  typia.assert(badge);

  // 3a. Update preferences with all fields changed to valid values (including edge values, e.g. flip bool)
  const validThemes = ["light", "dark", "system"] as const;
  const validLanguages = ["en", "ko", "ja"] as const;
  for (const theme of validThemes) {
    for (const language of validLanguages) {
      const updated =
        await api.functional.communityPlatform.member.profiles.preferences.update(
          connection,
          {
            profileId: member.id,
            body: {
              theme,
              language,
              show_email: RandomGenerator.pick([true, false]),
              show_badges: RandomGenerator.pick([true, false]),
              allow_messages_from_nonfollowers: RandomGenerator.pick([
                true,
                false,
              ]),
              notification_settings: JSON.stringify({
                mentions: true,
                message: false,
              }),
            } satisfies ICommunityPlatformProfilePreference.IUpdate,
          },
        );
      typia.assert(updated);
      TestValidator.equals(
        `theme set correctly for value ${theme}`,
        updated.theme,
        theme,
      );
      TestValidator.equals(
        `language set correctly for value ${language}`,
        updated.language,
        language,
      );
    }
  }

  // 3b. Boolean toggles
  const toggleBoolean = async (
    field: "show_email" | "show_badges" | "allow_messages_from_nonfollowers",
  ) => {
    const value = RandomGenerator.pick([true, false]);
    const input = {
      [field]: value,
    } satisfies ICommunityPlatformProfilePreference.IUpdate;
    const out =
      await api.functional.communityPlatform.member.profiles.preferences.update(
        connection,
        { profileId: member.id, body: input },
      );
    typia.assert(out);
    TestValidator.equals(`${field} toggle is correctly set`, out[field], value);
  };
  await toggleBoolean("show_email");
  await toggleBoolean("show_badges");
  await toggleBoolean("allow_messages_from_nonfollowers");

  // 3c. Clear notification_settings (set null)
  const clearedNotif =
    await api.functional.communityPlatform.member.profiles.preferences.update(
      connection,
      {
        profileId: member.id,
        body: {
          notification_settings: null,
        },
      },
    );
  typia.assert(clearedNotif);
  TestValidator.equals(
    "notification_settings is cleared",
    clearedNotif.notification_settings,
    null,
  );

  // 4. Attempt update with invalid theme (expect error)
  await TestValidator.error("invalid theme should be rejected", async () => {
    await api.functional.communityPlatform.member.profiles.preferences.update(
      connection,
      {
        profileId: member.id,
        body: { theme: "rainbow" },
      },
    );
  });
  // 5. Attempt with non-existent profileId (expect not found)
  await TestValidator.error(
    "non-existent profileId should be not found",
    async () => {
      await api.functional.communityPlatform.member.profiles.preferences.update(
        connection,
        {
          profileId: typia.random<string & tags.Format<"uuid">>(),
          body: { theme: "dark" },
        },
      );
    },
  );
  // 6. Register another member; try to update first member's preferences as this new user (expect forbidden)
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  await TestValidator.error(
    "updating another user's preferences is forbidden",
    async () => {
      await api.functional.communityPlatform.member.profiles.preferences.update(
        connection,
        {
          profileId: member.id,
          body: { theme: "light" },
        },
      );
    },
  );
}
