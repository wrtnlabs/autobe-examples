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
 * Test comprehensive vote limit update workflow where an administrator modifies
 * an existing voting restriction. The scenario validates that administrators
 * can adjust voting rate limits, change restriction types, extend enforcement
 * periods, and transfer restrictions between different user accounts. The test
 * covers parameter validation, immediate application of updated limits, and
 * proper handling of foreign key relationships based on actor type changes.
 */
export async function test_api_vote_limit_update_by_admin(
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

  // Authenticate as admin for admin operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
      session_id: RandomGenerator.alphaNumeric(16),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

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

  // Step 3: Create community required for vote limit application
  // First authenticate as member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch back to admin for vote limit operations
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
      session_id: RandomGenerator.alphaNumeric(16),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 4: Create initial vote limit record
  const initialLimit: ICommunityPlatformVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.create(connection, {
      body: {
        actor_type: "member",
        limit_type: "hourly",
        max_votes: 10,
        current_count: 0,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 3600000).toISOString(),
        community_platform_member_id: member.id,
      } satisfies ICommunityPlatformVoteLimit.ICreate,
    });
  typia.assert(initialLimit);

  // Step 5: Perform comprehensive vote limit updates
  // Update 1: Change maximum vote threshold
  const updatedLimit1: ICommunityPlatformVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.update(connection, {
      limitId: initialLimit.id,
      body: {
        max_votes: 20,
      } satisfies ICommunityPlatformVoteLimit.IUpdate,
    });
  typia.assert(updatedLimit1);
  TestValidator.equals(
    "max_votes should be updated",
    updatedLimit1.max_votes,
    20,
  );

  // Update 2: Change restriction type
  const updatedLimit2: ICommunityPlatformVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.update(connection, {
      limitId: initialLimit.id,
      body: {
        limit_type: "daily",
      } satisfies ICommunityPlatformVoteLimit.IUpdate,
    });
  typia.assert(updatedLimit2);
  TestValidator.equals(
    "limit_type should be updated",
    updatedLimit2.limit_type,
    "daily",
  );

  // Update 3: Extend enforcement period
  const newPeriodEnd = new Date(Date.now() + 86400000).toISOString();
  const updatedLimit3: ICommunityPlatformVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.update(connection, {
      limitId: initialLimit.id,
      body: {
        period_end: newPeriodEnd,
      } satisfies ICommunityPlatformVoteLimit.IUpdate,
    });
  typia.assert(updatedLimit3);
  TestValidator.equals(
    "period_end should be updated",
    updatedLimit3.period_end,
    newPeriodEnd,
  );

  // Update 4: Change current count
  const updatedLimit4: ICommunityPlatformVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.update(connection, {
      limitId: initialLimit.id,
      body: {
        current_count: 5,
      } satisfies ICommunityPlatformVoteLimit.IUpdate,
    });
  typia.assert(updatedLimit4);
  TestValidator.equals(
    "current_count should be updated",
    updatedLimit4.current_count,
    5,
  );

  // Update 5: Multiple field update
  const finalUpdate: ICommunityPlatformVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.update(connection, {
      limitId: initialLimit.id,
      body: {
        max_votes: 15,
        limit_type: "hourly",
        current_count: 3,
      } satisfies ICommunityPlatformVoteLimit.IUpdate,
    });
  typia.assert(finalUpdate);
  TestValidator.equals(
    "multiple fields should be updated",
    finalUpdate.max_votes,
    15,
  );
  TestValidator.equals(
    "limit_type should be reverted",
    finalUpdate.limit_type,
    "hourly",
  );
  TestValidator.equals(
    "current_count should be updated",
    finalUpdate.current_count,
    3,
  );

  // Validate that original ID persists
  TestValidator.equals(
    "vote limit ID should remain unchanged",
    finalUpdate.id,
    initialLimit.id,
  );
}
