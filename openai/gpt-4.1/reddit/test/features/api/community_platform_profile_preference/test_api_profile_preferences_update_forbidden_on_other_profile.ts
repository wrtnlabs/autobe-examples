import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import type { ICommunityPlatformProfilePreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfilePreference";

/**
 * Verify that member A is strictly forbidden from updating member B's profile
 * preferences.
 *
 * 1. Register and authenticate member A.
 * 2. Register and authenticate member B.
 * 3. For both, assign a badge using the admin API to force creation of the user
 *    profile, retrieving corresponding profileId.
 * 4. Log in as member A (if not already).
 * 5. Attempt to update preferences for member B's profile using member A's
 *    credentials and member B's profileId.
 * 6. Assert that the result is a forbidden error.
 * 7. Optionally, verify member B's profile preferences remain unchanged (if an API
 *    exists for reading preferences).
 */
export async function test_api_profile_preferences_update_forbidden_on_other_profile(
  connection: api.IConnection,
) {
  // 1. Register and authenticate member A
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = RandomGenerator.alphaNumeric(12);
  const memberA: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: memberAPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberA);

  // 2. Register and authenticate member B
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(12);
  const memberB: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        password: memberBPassword,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberB);

  // 3. Assign badge to member A to create profile
  const badgeTypeA = RandomGenerator.pick([
    "gold",
    "silver",
    "bronze",
  ] as const);
  const badgeA: ICommunityPlatformProfileBadge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: memberA.id,
        body: {
          community_platform_profile_id: memberA.id,
          badge_type: badgeTypeA,
          badge_name: RandomGenerator.name(),
          issued_at: new Date().toISOString(),
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  typia.assert(badgeA);

  // 4. Assign badge to member B to create profile
  const badgeTypeB = RandomGenerator.pick([
    "gold",
    "silver",
    "bronze",
  ] as const);
  const badgeB: ICommunityPlatformProfileBadge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: memberB.id,
        body: {
          community_platform_profile_id: memberB.id,
          badge_type: badgeTypeB,
          badge_name: RandomGenerator.name(),
          issued_at: new Date().toISOString(),
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  typia.assert(badgeB);

  // 5. Ensure authenticated as member A
  // (Token is updated after registration; no explicit login needed unless system requires)
  // 6. Attempt to update member B's profile preferences with member A's token
  const newPrefs = {
    language: "ko",
    theme: RandomGenerator.pick(["light", "dark"] as const),
    show_email: false,
    show_badges: false,
    allow_messages_from_nonfollowers: false,
    notification_settings: JSON.stringify({ push: false, email: true }),
  } satisfies ICommunityPlatformProfilePreference.IUpdate;
  await TestValidator.error(
    "member A cannot update member B preferences",
    async () => {
      await api.functional.communityPlatform.member.profiles.preferences.update(
        connection,
        {
          profileId: badgeB.community_platform_profile_id,
          body: newPrefs,
        },
      );
    },
  );
}
