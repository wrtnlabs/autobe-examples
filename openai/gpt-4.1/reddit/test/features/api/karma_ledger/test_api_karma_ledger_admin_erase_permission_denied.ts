import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that a non-admin member cannot delete a karma ledger. Steps:
 *
 * 1. Register admin, register member.
 * 2. Member creates a community.
 * 3. Admin creates a karma ledger for the member (optionally for a community).
 * 4. Switch to member (non-admin); try to erase the ledger and expect permission
 *    denied.
 * 5. The ledger should still exist afterwards (if there were a GET endpoint, here
 *    we'd check existence).
 */
export async function test_api_karma_ledger_admin_erase_permission_denied(
  connection: api.IConnection,
) {
  // 1. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin!2345",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberP@ss2024",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Member creates a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 8 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Switch to admin, create karma ledger for the member (use community in scope)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Admin!2345",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  const karmaLedger =
    await api.functional.communityPlatform.admin.karmaLedgers.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_community_id: community.id,
          current_karma: 100,
        } satisfies ICommunityPlatformKarmaLedger.ICreate,
      },
    );
  typia.assert(karmaLedger);

  // 5. Switch to member and attempt erasure
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "memberP@ss2024",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "member cannot erase a karma ledger (permission denied)",
    async () => {
      await api.functional.communityPlatform.admin.karmaLedgers.erase(
        connection,
        {
          karmaLedgerId: karmaLedger.id,
        },
      );
    },
  );
  // As there are no get-by-id endpoints, cannot directly check for record existence.
  // In a real test, would confirm that the record is not deleted.
}
