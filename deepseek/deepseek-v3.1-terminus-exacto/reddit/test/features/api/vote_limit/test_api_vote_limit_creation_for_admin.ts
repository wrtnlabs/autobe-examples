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
 * Test that administrators can create voting limits for other administrators
 * with elevated restriction parameters. Validates the platform's ability to
 * enforce voting restrictions across all user roles, including administrative
 * accounts. The scenario tests admin-to-admin voting limit creation and ensures
 * proper tracking of voting activity at the highest privilege levels,
 * maintaining system-wide voting integrity and preventing potential abuse
 * scenarios.
 */
export async function test_api_vote_limit_creation_for_admin(
  connection: api.IConnection,
) {
  // Step 1: Create first admin account (limit creator)
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: firstAdminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(firstAdmin);

  // Step 2: Create second admin account (target for voting limits)
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: secondAdminEmail,
      password: "AdminPassword456!",
      display_name: RandomGenerator.name(),
      admin_level: "content",
      is_super_admin: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(secondAdmin);

  // Step 3: Create voting limit record targeting the second admin
  const now = new Date();
  const votingLimitData = {
    actor_type: "admin",
    limit_type: "daily",
    max_votes: 500,
    current_count: 0,
    period_start: now.toISOString(),
    period_end: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    community_platform_admin_id: secondAdmin.id,
  } satisfies ICommunityPlatformVoteLimit.ICreate;

  const createdVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.create(connection, {
      body: votingLimitData,
    });
  typia.assert(createdVoteLimit);

  // Step 4: Validate the voting limit was created successfully
  TestValidator.equals(
    "actor_type should be admin",
    createdVoteLimit.actor_type,
    "admin",
  );
  TestValidator.equals(
    "limit_type should be daily",
    createdVoteLimit.limit_type,
    "daily",
  );
  TestValidator.equals(
    "max_votes should be 500",
    createdVoteLimit.max_votes,
    500,
  );
  TestValidator.equals(
    "current_count should be 0",
    createdVoteLimit.current_count,
    0,
  );
  TestValidator.equals(
    "admin_id should match target admin",
    createdVoteLimit.community_platform_admin_id,
    secondAdmin.id,
  );
  TestValidator.equals(
    "admin summary should exist",
    createdVoteLimit.admin?.id,
    secondAdmin.id,
  );
  TestValidator.equals(
    "admin display_name should match",
    createdVoteLimit.admin?.display_name,
    secondAdmin.display_name,
  );

  // Step 5: Verify the limit enforces proper restrictions
  TestValidator.predicate("period_start should be valid date", () => {
    const startDate = new Date(createdVoteLimit.period_start);
    return !isNaN(startDate.getTime());
  });

  TestValidator.predicate("period_end should be valid date", () => {
    const endDate = new Date(createdVoteLimit.period_end);
    return !isNaN(endDate.getTime());
  });

  TestValidator.predicate("period_end should be after period_start", () => {
    const startDate = new Date(createdVoteLimit.period_start);
    const endDate = new Date(createdVoteLimit.period_end);
    return endDate > startDate;
  });

  // Validate that the voting limit is properly associated with the target admin
  TestValidator.equals(
    "created_at should be set",
    typeof createdVoteLimit.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at should be set",
    typeof createdVoteLimit.updated_at,
    "string",
  );
}
