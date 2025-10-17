import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";

/**
 * Validate badge assignment to user profiles by admin.
 *
 * This test ensures that an admin can properly assign badges to user profiles
 * according to business rules. It checks for uniqueness constraints (the same
 * badge cannot be assigned twice to the same profile), correct assignment
 * linkage, and error handling on duplicate assignments.
 *
 * Steps:
 *
 * 1. Register and authenticate as platform admin (join)
 * 2. Select a target profileId for badge assignment (simulated by random UUID; no
 *    user creation API exists)
 * 3. Create a new badge with specific type and name, assigned to the target
 *    profileId
 * 4. Verify response is a valid ICommunityPlatformProfileBadge, correctly linked
 *    to the target profileId and matches input badge_type and badge_name
 * 5. Attempt to assign the same badge_type and badge_name again to the same
 *    profileId; confirm that the API throws an error (uniqueness constraint)
 */
export async function test_api_profile_badge_assignment_by_admin(
  connection: api.IConnection,
) {
  // 1. Register/admin join (platform admin registration)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "securePassword123!",
        superuser: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Generate a target profile UUID (simulate target user, as no user/profile creation API in context)
  const profileId = typia.random<string & tags.Format<"uuid">>();

  // 3. Assign a badge to the profile
  const badgeInput = {
    community_platform_profile_id: profileId,
    badge_type: "gold",
    badge_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 4,
      wordMax: 8,
    }),
    issued_at: new Date().toISOString(),
    issuer: admin.email,
  } satisfies ICommunityPlatformProfileBadge.ICreate;

  const badge: ICommunityPlatformProfileBadge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId,
        body: badgeInput,
      },
    );
  typia.assert(badge);
  TestValidator.equals(
    "badge profile linkage",
    badge.community_platform_profile_id,
    profileId,
  );
  TestValidator.equals(
    "badge type matches",
    badge.badge_type,
    badgeInput.badge_type,
  );
  TestValidator.equals(
    "badge name matches",
    badge.badge_name,
    badgeInput.badge_name,
  );
  TestValidator.equals("issuer matches admin", badge.issuer, badgeInput.issuer);

  // 4. Attempt to assign the same badge again to the same profile, which should fail by business rule (uniqueness)
  await TestValidator.error(
    "duplicate badge assignment is rejected",
    async () => {
      await api.functional.communityPlatform.admin.profiles.badges.create(
        connection,
        {
          profileId,
          body: badgeInput,
        },
      );
    },
  );
}
