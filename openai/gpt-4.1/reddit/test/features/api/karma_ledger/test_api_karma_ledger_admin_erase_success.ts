import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformKarmaLedger } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaLedger";

/**
 * Validate successful hard deletion of a karma ledger by an admin.
 *
 * Steps:
 *
 * 1. Register new admin with unique email/password
 * 2. Create a new community as admin
 * 3. Create a random member UUID (simulate flow, as actual member creation is not
 *    exposed here)
 * 4. As admin, create a karma ledger for that member-community pair
 * 5. Hard delete the karma ledger by its ID
 * 6. Attempt to delete again, confirm API errors Business rules: only admins can
 *    run this flow; audit logs are left to backend.
 */
export async function test_api_karma_ledger_admin_erase_success(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
          slug: RandomGenerator.alphaNumeric(8),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create fake member UUID (simulate scenario: actual member creation API not available for flow)
  const memberId = typia.random<string & tags.Format<"uuid">>();

  // 4. Admin creates karma ledger for this member/community
  const karmaLedger =
    await api.functional.communityPlatform.admin.karmaLedgers.create(
      connection,
      {
        body: {
          community_platform_member_id: memberId,
          community_platform_community_id: community.id,
          current_karma: typia.random<number & tags.Type<"int32">>(),
          feature_lock_reason: null,
        } satisfies ICommunityPlatformKarmaLedger.ICreate,
      },
    );
  typia.assert(karmaLedger);

  // 5. Admin hard-deletes (erase) the karma ledger
  await api.functional.communityPlatform.admin.karmaLedgers.erase(connection, {
    karmaLedgerId: karmaLedger.id,
  });
  // 6. Re-erase should fail (already deleted)
  await TestValidator.error(
    "delete already removed karma ledger should fail",
    async () => {
      await api.functional.communityPlatform.admin.karmaLedgers.erase(
        connection,
        {
          karmaLedgerId: karmaLedger.id,
        },
      );
    },
  );
}
