import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";

/**
 * Admin badge assignment and hard profile deletion lifecycle test.
 *
 * Steps:
 *
 * 1. Register a new admin for privileged operations.
 * 2. Prepare a random profile ID as the mock target for test (simulate ID
 *    acquisition).
 * 3. Assign a badge to that profile.
 * 4. Delete the profile via admin endpoint.
 * 5. Verify the badge's deleted_at field is set (indirectly via successful DELETE
 *    since no profile listing available).
 * 6. Try to delete the profile again and expect error.
 * 7. Try to delete a random, non-existent profile and expect error.
 */
export async function test_api_admin_profile_hard_deletion_with_badges(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Prepare profileId
  const profileId = typia.random<string & tags.Format<"uuid">>();

  // 3. Assign badge to profile
  const badge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: profileId,
        body: {
          community_platform_profile_id: profileId,
          badge_type: "gold",
          badge_name: RandomGenerator.name(1),
          issued_at: new Date().toISOString(),
          issuer: admin.email,
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  typia.assert(badge);
  TestValidator.equals(
    "badge is for our profile",
    badge.community_platform_profile_id,
    profileId,
  );

  // 4. Admin deletes the profile
  await api.functional.communityPlatform.admin.profiles.erase(connection, {
    profileId,
  });

  // 5. Try to assign badge after deletion (should error)
  await TestValidator.error(
    "cannot assign badge to deleted profile",
    async () => {
      await api.functional.communityPlatform.admin.profiles.badges.create(
        connection,
        {
          profileId,
          body: {
            community_platform_profile_id: profileId,
            badge_type: "silver",
            badge_name: RandomGenerator.name(1),
            issued_at: new Date().toISOString(),
            issuer: admin.email,
          } satisfies ICommunityPlatformProfileBadge.ICreate,
        },
      );
    },
  );

  // 6. Try to delete again (should error, idempotency/concurrency check)
  await TestValidator.error("cannot delete profile twice", async () => {
    await api.functional.communityPlatform.admin.profiles.erase(connection, {
      profileId,
    });
  });

  // 7. Try deleting a random, non-existent profile (should error)
  await TestValidator.error("cannot delete non-existent profile", async () => {
    await api.functional.communityPlatform.admin.profiles.erase(connection, {
      profileId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
