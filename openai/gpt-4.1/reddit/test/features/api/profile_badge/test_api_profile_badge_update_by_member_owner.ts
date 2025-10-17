import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";

/**
 * Validate that a member can update their own profile badge's data and that
 * modification rights are enforced correctly.
 *
 * Steps:
 *
 * 1. Register/test member (the badge/profile owner) and authenticate; store their
 *    profile ID.
 * 2. Register/test admin and authenticate.
 * 3. Admin assigns a badge to the member profile.
 * 4. Switch context to member (profile owner) and update the badge's editable
 *    fields.
 * 5. Retrieve and validate changes (badge_name and badge_type updated).
 * 6. Attempt update as a different (non-owner) member; confirm update is denied.
 */
export async function test_api_profile_badge_update_by_member_owner(
  connection: api.IConnection,
) {
  // 1. Member register & authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPass = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPass,
    },
  });
  typia.assert(member);
  const profileId = member.id;

  // 2. Admin register & authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPass = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
      superuser: true,
    },
  });
  typia.assert(admin);

  // 3. Admin assigns badge to member (use admin's JWT needed under the hood)
  const badgeInit: ICommunityPlatformProfileBadge.ICreate = {
    community_platform_profile_id: profileId,
    badge_type: RandomGenerator.paragraph({ sentences: 1 }),
    badge_name: RandomGenerator.paragraph({ sentences: 1 }),
    issued_at: new Date().toISOString(),
    // Omitting karma_award_id and issuer for generic badge, can be added as needed
  };
  const createdBadge =
    await api.functional.communityPlatform.admin.profiles.badges.create(
      connection,
      {
        profileId,
        body: badgeInit,
      },
    );
  typia.assert(createdBadge);
  const badgeId = createdBadge.id;

  // 4. Switch context to member/owner
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPass,
    },
  });

  // 5. Owner update: legal fields (badge_name, badge_type)
  const updateData: ICommunityPlatformProfileBadge.IUpdate = {
    badge_type: RandomGenerator.paragraph({ sentences: 1 }),
    badge_name: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const updatedBadge =
    await api.functional.communityPlatform.member.profiles.badges.update(
      connection,
      {
        profileId,
        badgeId,
        body: updateData,
      },
    );
  typia.assert(updatedBadge);
  TestValidator.equals(
    "badge_name updated",
    updatedBadge.badge_name,
    updateData.badge_name,
  );
  TestValidator.equals(
    "badge_type updated",
    updatedBadge.badge_type,
    updateData.badge_type,
  );

  // 6. Negative case: another member attempts update (should fail)
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherPass = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.member.join(connection, {
    body: { email: otherEmail, password: otherPass },
  });
  await TestValidator.error("non-owner cannot update badge", async () => {
    await api.functional.communityPlatform.member.profiles.badges.update(
      connection,
      {
        profileId,
        badgeId,
        body: { badge_name: "Should Not Work" },
      },
    );
  });
}
