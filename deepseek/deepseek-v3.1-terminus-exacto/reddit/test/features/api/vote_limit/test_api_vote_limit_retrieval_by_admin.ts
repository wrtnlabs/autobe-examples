import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformVoteLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteLimit";

/**
 * Test that administrators can retrieve detailed voting limit records they have
 * created. Validates proper access control and data integrity for voting
 * restriction management. This tests the platform's anti-spam mechanism
 * tracking and ensures administrators can monitor voting restriction
 * enforcement effectively.
 */
export async function test_api_vote_limit_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidPass123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create a voting limit record for the admin
  const currentDate = new Date();
  const periodStart = currentDate.toISOString();
  const periodEnd = new Date(
    currentDate.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString(); // 24 hours later

  const voteLimitData = {
    actor_type: "admin",
    limit_type: "daily",
    max_votes: 100,
    current_count: 0,
    period_start: periodStart,
    period_end: periodEnd,
    community_platform_admin_id: admin.id,
  } satisfies ICommunityPlatformVoteLimit.ICreate;

  const createdVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.create(connection, {
      body: voteLimitData,
    });
  typia.assert(createdVoteLimit);

  // Step 3: Retrieve the voting limit record
  const retrievedVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.at(connection, {
      limitId: createdVoteLimit.id,
    });
  typia.assert(retrievedVoteLimit);

  // Step 4: Validate that retrieved data matches created data
  TestValidator.equals(
    "vote limit ID matches",
    retrievedVoteLimit.id,
    createdVoteLimit.id,
  );
  TestValidator.equals(
    "actor type matches",
    retrievedVoteLimit.actor_type,
    voteLimitData.actor_type,
  );
  TestValidator.equals(
    "limit type matches",
    retrievedVoteLimit.limit_type,
    voteLimitData.limit_type,
  );
  TestValidator.equals(
    "max votes matches",
    retrievedVoteLimit.max_votes,
    voteLimitData.max_votes,
  );
  TestValidator.equals(
    "current count matches",
    retrievedVoteLimit.current_count,
    voteLimitData.current_count,
  );
  TestValidator.equals(
    "period start matches",
    retrievedVoteLimit.period_start,
    voteLimitData.period_start,
  );
  TestValidator.equals(
    "period end matches",
    retrievedVoteLimit.period_end,
    voteLimitData.period_end,
  );
  TestValidator.equals(
    "admin ID matches",
    retrievedVoteLimit.community_platform_admin_id,
    admin.id,
  );

  // Additional validation for timestamp fields
  TestValidator.predicate(
    "created_at timestamp is valid",
    retrievedVoteLimit.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    retrievedVoteLimit.updated_at.length > 0,
  );
}
