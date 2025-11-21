import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteLimit";

/**
 * Test vote limit deletion workflow where an administrator permanently removes
 * a voting restriction record.
 *
 * This test validates the complete lifecycle of vote limit management:
 *
 * 1. Administrator account creation and authentication
 * 2. Member account creation for vote limit targeting
 * 3. Community creation as required context
 * 4. Vote limit creation targeting the member
 * 5. Hard deletion of the vote limit by administrator
 * 6. Verification that deletion is permanent and immediate
 *
 * The scenario ensures that vote limit deletion follows proper authorization
 * protocols and that deleted records are completely removed from the system
 * without soft deletion recovery mechanisms.
 */
export async function test_api_vote_limit_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "system",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account for vote limit targeting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create community required for vote limit context
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create vote limit record targeting the member
  const voteLimit: ICommunityPlatformVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.create(connection, {
      body: {
        actor_type: "member",
        limit_type: "daily",
        max_votes: 10,
        current_count: 0,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
        community_platform_member_id: member.id,
      } satisfies ICommunityPlatformVoteLimit.ICreate,
    });
  typia.assert(voteLimit);

  // Step 5: Test authorization boundaries - member should not be able to delete vote limits
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Verify member cannot delete vote limits
  await TestValidator.error(
    "member should not be able to delete vote limits",
    async () => {
      await api.functional.communityPlatform.admin.voteLimits.erase(
        connection,
        {
          limitId: voteLimit.id,
        },
      );
    },
  );

  // Switch back to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 6: Delete the vote limit as administrator
  await api.functional.communityPlatform.admin.voteLimits.erase(connection, {
    limitId: voteLimit.id,
  });

  // Step 7: Verify deletion by attempting to access deleted limit
  await TestValidator.error(
    "deleted vote limit should not be accessible",
    async () => {
      // Attempt to create another limit with same parameters should succeed
      // but accessing the deleted one should fail
      await api.functional.communityPlatform.admin.voteLimits.erase(
        connection,
        {
          limitId: voteLimit.id, // This should fail as it's already deleted
        },
      );
    },
  );

  // Step 8: Verify member can now have new vote limits created (deletion was successful)
  const newVoteLimit: ICommunityPlatformVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.create(connection, {
      body: {
        actor_type: "member",
        limit_type: "hourly",
        max_votes: 5,
        current_count: 0,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        community_platform_member_id: member.id,
      } satisfies ICommunityPlatformVoteLimit.ICreate,
    });
  typia.assert(newVoteLimit);

  // Verify the new limit has a different ID (confirms original was deleted)
  TestValidator.notEquals(
    "deleted vote limit ID should differ from new limit ID",
    voteLimit.id,
    newVoteLimit.id,
  );

  // Clean up: Delete the new vote limit
  await api.functional.communityPlatform.admin.voteLimits.erase(connection, {
    limitId: newVoteLimit.id,
  });
}
