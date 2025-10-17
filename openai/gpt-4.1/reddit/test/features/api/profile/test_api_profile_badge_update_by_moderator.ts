import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";

/**
 * Test authorized moderator can update a profile badge, and unauthorized
 * moderator is denied.
 *
 * 1. Register a platform member (member1); this will be the profile owner.
 * 2. Register a second platform member (member2), for negative tests.
 * 3. Register a moderator (mod1) on a specific community (comm1), assign it to
 *    member1's community.
 * 4. Register another moderator (mod2) on a different community (comm2), for
 *    negative tests.
 * 5. Register an admin, authenticate as admin, and assign a badge to member1's
 *    profile (using admin API).
 * 6. Switch to moderator (mod1) and update the badge for member1's profile.
 *
 *    - Change badge_type, badge_name, and update issuer.
 *    - Validate fields are updated accordingly.
 * 7. Switch to moderator (mod2) and try to update the badge for member1's profile.
 *
 *    - Should be denied; assert error for insufficient privileges.
 */
export async function test_api_profile_badge_update_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register member1
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: "member1_pass",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  // Step 2: Register member2 (for negative test)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: "member2_pass",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Step 3: Register moderator (mod1) assigned to member1's community (use member1.id as community_id)
  const mod1Email = typia.random<string & tags.Format<"email">>();
  const mod1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod1Email,
      password: "mod1_pass" as string & tags.Format<"password">,
      community_id: member1.id as string & tags.Format<"uuid">,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(mod1);

  // Step 4: Register moderator (mod2) assigned to another community (use member2.id as community_id)
  const mod2Email = typia.random<string & tags.Format<"email">>();
  const mod2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod2Email,
      password: "mod2_pass" as string & tags.Format<"password">,
      community_id: member2.id as string & tags.Format<"uuid">,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(mod2);

  // Step 5: Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin_pass",
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 6: Assign a badge to member1's profile (admin privilege)
  const badgeCreate = {
    community_platform_profile_id: member1.id,
    badge_type: "gold",
    badge_name: RandomGenerator.paragraph({ sentences: 1 }),
    issued_at: new Date().toISOString(),
    issuer: "admin",
  } satisfies ICommunityPlatformProfileBadge.ICreate;
  const badge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId: member1.id,
        body: badgeCreate,
      },
    );
  typia.assert(badge);

  // Step 7: Switch to mod1 and update the badge (authorized)
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod1Email,
      password: "mod1_pass" as string & tags.Format<"password">,
      community_id: member1.id as string & tags.Format<"uuid">,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  const badgeUpdate = {
    badge_type: "platinum",
    badge_name: RandomGenerator.paragraph({ sentences: 1 }),
    issuer: "mod1_updated",
  } satisfies ICommunityPlatformProfileBadge.IUpdate;
  const updated =
    await api.functional.communityPlatform.moderator.profiles.badges.update(
      connection,
      {
        profileId: member1.id,
        badgeId: badge.id,
        body: badgeUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "badge_type updated",
    updated.badge_type,
    badgeUpdate.badge_type,
  );
  TestValidator.equals(
    "badge_name updated",
    updated.badge_name,
    badgeUpdate.badge_name,
  );
  TestValidator.equals("issuer updated", updated.issuer, badgeUpdate.issuer);

  // Step 8: Switch to mod2 (not authorized for member1) and try to update badge
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: mod2Email,
      password: "mod2_pass" as string & tags.Format<"password">,
      community_id: member2.id as string & tags.Format<"uuid">,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  await TestValidator.error(
    "unauthorized moderator cannot update badge",
    async () => {
      await api.functional.communityPlatform.moderator.profiles.badges.update(
        connection,
        {
          profileId: member1.id,
          badgeId: badge.id,
          body: {
            badge_type: "hacker",
            badge_name: "Should Not Work",
            issuer: "bad_mod",
          } satisfies ICommunityPlatformProfileBadge.IUpdate,
        },
      );
    },
  );
}
