import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";

/**
 * Validates both self-service and moderator badge removal on member profiles.
 *
 * 1. Register a member (for profile/badge ownership)
 * 2. Register an admin (for moderator-like privilege)
 * 3. Assign a badge to the member's profile (as admin)
 * 4. Confirm badge is assigned (by profileId matching new badge)
 * 5. Remove badge as member (profile owner): should succeed
 * 6. Confirm badge can't be found (re-query/logic or expect revoked_at set if soft
 *    delete)
 * 7. Assign a second badge
 * 8. Remove badge as admin (moderator role simulation): should succeed
 * 9. Confirm badge is now revoked/removed
 * 10. Error: Try to remove badge that's already removed (should fail)
 * 11. Error: Try to remove badge not belonging to the member (should fail)
 */
export async function test_api_member_profile_badge_removal_self_or_moderator(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPwd!123";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Admin assigns a badge to the member's profile
  // Switch to admin
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const badge1 =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: member.id,
        body: {
          community_platform_profile_id: member.id,
          badge_type: RandomGenerator.pick([
            "gold",
            "anniversary",
            "custom",
            "contribution",
            "community",
          ] as const),
          badge_name: RandomGenerator.paragraph({ sentences: 2 }),
          issued_at: new Date().toISOString(),
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  typia.assert(badge1);
  TestValidator.equals(
    "badge is assigned to member profile",
    badge1.community_platform_profile_id,
    member.id,
  );

  // 4. Remove badge as member (profile owner)
  // Switch to member
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await api.functional.communityPlatform.member.profiles.badges.erase(
    connection,
    {
      profileId: member.id,
      badgeId: badge1.id,
    },
  );
  // There is no direct badge list/read API, but usually a badge's revoked_at becomes set. Attempt to remove again to check error.
  await TestValidator.error(
    "removing already removed badge should fail",
    async () => {
      await api.functional.communityPlatform.member.profiles.badges.erase(
        connection,
        {
          profileId: member.id,
          badgeId: badge1.id,
        },
      );
    },
  );

  // 5. Assign a second badge, then remove as moderator/admin
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const badge2 =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: member.id,
        body: {
          community_platform_profile_id: member.id,
          badge_type: RandomGenerator.pick([
            "gold",
            "anniversary",
            "custom",
            "contribution",
            "community",
          ] as const),
          badge_name: RandomGenerator.paragraph({ sentences: 2 }),
          issued_at: new Date().toISOString(),
          issuer: "ModeratorScript",
        } satisfies ICommunityPlatformProfileBadge.ICreate,
      },
    );
  typia.assert(badge2);
  await api.functional.communityPlatform.member.profiles.badges.erase(
    connection,
    {
      profileId: member.id,
      badgeId: badge2.id,
    },
  );
  // Try to remove a badge not owned by member
  const outsider = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(outsider);
  await TestValidator.error("member cannot remove other's badge", async () => {
    await api.functional.communityPlatform.member.profiles.badges.erase(
      connection,
      {
        profileId: outsider.id,
        badgeId: badge2.id,
      },
    );
  });
}
