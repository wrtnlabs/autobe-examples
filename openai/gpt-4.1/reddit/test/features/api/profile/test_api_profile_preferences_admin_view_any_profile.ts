import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import type { ICommunityPlatformProfilePreferences } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfilePreferences";

/**
 * Validate that an admin can view any user profile preferences, regardless of
 * profile ownership. This test verifies that admin-level access allows
 * inspection of arbitrary user profile preference settings.
 *
 * Steps:
 *
 * 1. Register a new platform admin.
 * 2. Register a member, obtaining their profileId from the returned authorized
 *    object.
 * 3. As admin, assign a badge to the member's profile, ensuring the profile
 *    exists.
 * 4. Fetch the profile preferences for that member via the admin endpoint.
 * 5. Assert that the admin retrieves all settings, regardless of ownership.
 */
export async function test_api_profile_preferences_admin_view_any_profile(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin-password-123!",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register a new member (as admin is now authenticated)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "user-password-567!",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  const profileId = typia.assert<string & tags.Format<"uuid">>(member.id);

  // 3. Assign a badge to the member's profile (enforces profile preferences exist)
  const badge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId,
        body: {
          community_platform_profile_id: profileId,
          badge_type: "test-badge-type",
          badge_name: RandomGenerator.name(2),
          issued_at: new Date().toISOString(),
          issuer: admin.email,
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  typia.assert(badge);

  // 4. Fetch the member's profile preferences as the admin
  const preferences =
    await api.functional.communityPlatform.admin.profiles.preferences.at(
      connection,
      { profileId },
    );
  typia.assert(preferences);

  // 5. Validate retrieved preferences
  TestValidator.equals(
    "profile id in preferences matches the member's profile id",
    preferences.community_platform_profile_id,
    profileId,
  );
  TestValidator.predicate(
    "admin can access show_email and show_badges settings",
    typeof preferences.show_email === "boolean" &&
      typeof preferences.show_badges === "boolean",
  );
  TestValidator.predicate(
    "admin can access allow_messages_from_nonfollowers",
    typeof preferences.allow_messages_from_nonfollowers === "boolean",
  );
}
