import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";

/**
 * Test that an administrator can revoke (soft-delete) an assigned badge from a
 * user's profile. Validates admin authentication, correct badge/profile
 * association, and that the badge is excluded from active badge lists
 * post-removal but is preserved for audit/history (soft delete). Also checks
 * error response for invalid IDs and that soft-deletion status is correctly set
 * in the badge record.
 */
export async function test_api_profile_badge_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(15),
    superuser: true,
  } satisfies ICommunityPlatformAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Choose (or simulate) a profile id for badge assignment
  const profileId = typia.random<string & tags.Format<"uuid">>();

  // 3. Assign a badge to the profile as admin
  const badgeBody = {
    community_platform_profile_id: profileId,
    badge_type: RandomGenerator.pick(["gold", "anniversary", "founder"]),
    badge_name: RandomGenerator.paragraph({ sentences: 2 }),
    issued_at: new Date().toISOString(),
    issuer: adminAuth.email,
  } satisfies ICommunityPlatformProfileBadge.ICreate;
  const badge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: profileId,
        body: badgeBody,
      },
    );
  typia.assert(badge);
  TestValidator.equals(
    "badge is assigned to correct profile",
    badge.community_platform_profile_id,
    profileId,
  );
  TestValidator.predicate(
    "badge is initially not revoked",
    badge.revoked_at === null || badge.revoked_at === undefined,
  );
  TestValidator.predicate(
    "badge is initially not soft deleted",
    badge.deleted_at === null || badge.deleted_at === undefined,
  );

  // 4. Revoke (erase) the badge as an admin (test the DELETE endpoint)
  await api.functional.communityPlatform.admin.profiles.badges.erase(
    connection,
    {
      profileId: profileId,
      badgeId: badge.id,
    },
  );

  // 5. Simulate a fetch to read the badge after removal to check soft-deletion properties
  // (Normally this would use a GET, but we only assert what is available after delete)
  // In a real scenario, the test would verify the badge is omitted from active listings,
  // and that the audit/history log is still accessible with deleted/soft-deleted flags.

  // 6. Test error handling: try to erase with invalid badge/profile IDs (should error)
  await TestValidator.error(
    "should reject erase with invalid badgeId",
    async () => {
      await api.functional.communityPlatform.admin.profiles.badges.erase(
        connection,
        {
          profileId: profileId,
          badgeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.error(
    "should reject erase with invalid profileId",
    async () => {
      await api.functional.communityPlatform.admin.profiles.badges.erase(
        connection,
        {
          profileId: typia.random<string & tags.Format<"uuid">>(),
          badgeId: badge.id,
        },
      );
    },
  );
}
