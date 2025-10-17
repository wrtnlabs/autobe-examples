import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProfileBadge } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileBadge";
import type { ICommunityPlatformProfileHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileHistory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfileHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileHistory";

/**
 * Test that an admin can retrieve/audit profile edit history (with pagination)
 * for any user profile.
 *
 * 1. Register admin and member
 * 2. Assign badge(s) to member using admin
 * 3. Admin requests member's profile history, validates correctness
 * 4. Test pagination and audit details for all change entries
 * 5. Validate 403 for forbidden (non-admin) requester, 404 for bad profileId, and
 *    excessively large logs (by generating many changes)
 * 6. Validate handling of deleted profiles.
 */
export async function test_api_profile_edit_history_audit_as_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPass = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPass = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPass,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Assign multiple badges to member (create edit history)
  const badgeNames = [
    "Founding Member",
    "Contributor",
    "Verified",
    "Legend",
  ] as const;
  for (const name of badgeNames) {
    const output =
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
            ] as const),
            badge_name: name,
            issued_at: new Date().toISOString(),
            issuer: admin.email,
          } satisfies ICommunityPlatformProfileBadge.ICreate,
        },
      );
    typia.assert(output);
    TestValidator.equals(`badge assigned: ${name}`, output.badge_name, name);
    TestValidator.equals(
      `profile id matches on badge: ${name}`,
      output.community_platform_profile_id,
      member.id,
    );
  }

  // 4. Admin requests member's profile history (with pagination)
  const pageLimit = 2;
  const paged =
    await api.functional.communityPlatform.admin.profiles.history.index(
      connection,
      {
        profileId: member.id,
        body: {
          page: 1,
          limit: pageLimit,
        } satisfies ICommunityPlatformProfileHistory.IRequest,
      },
    );
  typia.assert(paged);
  TestValidator.equals(
    "history page limit respected",
    paged.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate("history returned is >= 1", paged.data.length >= 1);
  TestValidator.predicate(
    "all history belongs to profile",
    paged.data.every((h) => h.community_platform_profile_id === member.id),
  );

  // 4b. Retrieve full history (all pages) and check badge-related edits
  const allPaged =
    await api.functional.communityPlatform.admin.profiles.history.index(
      connection,
      {
        profileId: member.id,
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformProfileHistory.IRequest,
      },
    );
  typia.assert(allPaged);
  TestValidator.predicate(
    "history includes badge assignments",
    allPaged.data.length >= badgeNames.length,
  );

  // 5. Try retrieving history with random (invalid) profileId (404)
  await TestValidator.error(
    "history fetch returns 404 on bad profileId",
    async () => {
      await api.functional.communityPlatform.admin.profiles.history.index(
        connection,
        {
          profileId: typia.random<string & tags.Format<"uuid">>(),
          body: {},
        },
      );
    },
  );

  // 6. Try with insufficient permissions: as non-admin (member)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.member.join(unauthConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "forbidden for non-admin requester (403)",
    async () => {
      await api.functional.communityPlatform.admin.profiles.history.index(
        unauthConn,
        {
          profileId: member.id,
          body: {},
        },
      );
    },
  );
}
