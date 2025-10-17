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
 * Validate that non-admin users (members) are forbidden from updating a karma
 * ledger via the admin endpoint.
 *
 * This test simulates the following business flow:
 *
 * 1. Register an admin user (for setup).
 * 2. Register a regular member user.
 * 3. Member user creates a community (the context for assigning karma ledger).
 * 4. Admin user creates a karma ledger for the member (may be global or
 *    community-scoped).
 * 5. Member attempts to update the karma ledger using the admin endpoint, which
 *    should fail with a forbidden error.
 * 6. Validate that the karma ledger remains unchanged after the failed update
 *    attempt by reattempting with admin (optional, if an API exists to retrieve
 *    ledger state).
 *
 * The business requirement validated here is strict access control: only admin
 * can perform updates via the admin endpoint; members must be forbidden from
 * altering karma ledgers through privileged API paths.
 *
 * Steps:
 *
 * 1. Generate unique emails and credentials for both admin and member.
 * 2. Register admin with api.functional.auth.admin.join().
 * 3. Register member with api.functional.auth.member.join().
 * 4. Switch auth context to member, create a community using
 *    api.functional.communityPlatform.member.communities.create().
 * 5. Switch back to admin context, use
 *    api.functional.communityPlatform.admin.karmaLedgers.create() to create the
 *    ledger entry referencing the member id/community id.
 * 6. Switch context to member.
 * 7. Attempt to call api.functional.communityPlatform.admin.karmaLedgers.update()
 *    with member credentials; this should throw an error (forbidden).
 * 8. Optionally, reauth as admin and inspect the ledger for changes (if a read
 *    endpoint is available), but as reads are not available here, we assert
 *    only that error is thrown and no exception is made for non-admins.
 */
export async function test_api_karma_ledger_admin_update_permission_denied(
  connection: api.IConnection,
) {
  // 1. Generate unique emails and credentials for both accounts
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);

  // 2. Register admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 3. Register member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 4. Switch to member, create community
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  }); // sets token
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Switch back to admin and create karma ledger for member
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  }); // sets admin token
  const karmaLedger =
    await api.functional.communityPlatform.admin.karmaLedgers.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_community_id: community.id,
          current_karma: 10,
          feature_lock_reason: null,
        } satisfies ICommunityPlatformKarmaLedger.ICreate,
      },
    );
  typia.assert(karmaLedger);

  // 6. Switch to member auth context
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // 7. Attempt forbidden update to karma ledger (should fail)
  await TestValidator.error(
    "member cannot update karma ledger via admin endpoint",
    async () => {
      await api.functional.communityPlatform.admin.karmaLedgers.update(
        connection,
        {
          karmaLedgerId: karmaLedger.id,
          body: {
            current_karma: 50, // attempt to change karma
          } satisfies ICommunityPlatformKarmaLedger.IUpdate,
        },
      );
    },
  );
}
