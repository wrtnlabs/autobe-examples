import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";

/**
 * Test that a moderator can successfully revoke (soft-delete) an existing badge
 * from a user's profile by using moderator permissions.
 *
 * Steps:
 *
 * 1. Register a new admin account (for assigning badge).
 * 2. (Simulate) Create a test profile UUID (since profile creation API is not part
 *    of listed endpoints — use a random UUID for test).
 * 3. As admin, assign a badge to the profile.
 * 4. Register a new moderator account for the community.
 * 5. As moderator, revoke (erase) the badge from the profile.
 * 6. (Edge case) Attempt to revoke a badge from another profile (random UUID) and
 *    ensure error is returned.
 * 7. (Edge case) Attempt to revoke a non-existent badge and ensure error is
 *    returned.
 */
export async function test_api_profile_badge_revocation_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin123!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Simulate a test profile ID and community ID for badge assignment. (Assume profile belongs to community.)
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  const testProfileId = typia.random<string & tags.Format<"uuid">>();

  // 3. Assign a badge as admin
  const badgeAssignment =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: testProfileId,
        body: {
          community_platform_profile_id: testProfileId,
          badge_type: RandomGenerator.pick([
            "gold",
            "anniversary",
            "contributor",
          ] as const),
          badge_name: RandomGenerator.name(2),
          issuer: admin.email,
          issued_at: new Date().toISOString(),
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  typia.assert(badgeAssignment);

  // 4. Register a moderator for the same community
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = "ModerateMe42$";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: modEmail,
      password: modPassword,
      community_id: testCommunityId,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 5. Attempt to erase the badge as moderator (simulate moderator is authorized for this community)
  await api.functional.communityPlatform.moderator.profiles.badges.erase(
    connection,
    {
      profileId: badgeAssignment.community_platform_profile_id,
      badgeId: badgeAssignment.id,
    },
  );
  // Soft-delete effects (such as revoked_at) cannot be verified without read/list API,
  // but at least ensure the call passes without error.

  // 6. Edge Case: Attempt to revoke a badge from a different profile (use random UUIDs)
  await TestValidator.error(
    "revoking badge from unrelated profile fails",
    async () => {
      await api.functional.communityPlatform.moderator.profiles.badges.erase(
        connection,
        {
          profileId: typia.random<string & tags.Format<"uuid">>(), // unrelated profile ID
          badgeId: badgeAssignment.id,
        },
      );
    },
  );

  // 7. Edge Case: Attempt to revoke a non-existent badge
  await TestValidator.error("revoking non-existent badge fails", async () => {
    await api.functional.communityPlatform.moderator.profiles.badges.erase(
      connection,
      {
        profileId: testProfileId,
        badgeId: typia.random<string & tags.Format<"uuid">>(), // non-existent badge ID
      },
    );
  });
}
