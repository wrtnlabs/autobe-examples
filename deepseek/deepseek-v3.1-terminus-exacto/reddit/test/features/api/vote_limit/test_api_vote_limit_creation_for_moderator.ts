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
 * Test that administrators can create voting limits for moderators with
 * different restriction parameters. Validates the ability to apply voting
 * restrictions to elevated user roles with appropriate limit configurations.
 * The scenario tests moderator-specific voting limits and ensures the system
 * properly tracks voting patterns across different user privilege levels while
 * maintaining platform integrity and preventing abuse of moderation powers.
 */
export async function test_api_vote_limit_creation_for_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for limit creation
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

  // Step 2: Create moderator account to apply voting limits to
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        display_name: RandomGenerator.name(),
        moderator_level: "global",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create voting limit for moderator
  const now = new Date();
  const periodStart = now.toISOString();
  const periodEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1 hour limit

  const voteLimit: ICommunityPlatformVoteLimit =
    await api.functional.communityPlatform.admin.voteLimits.create(connection, {
      body: {
        actor_type: "moderator",
        limit_type: "hourly",
        max_votes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
        current_count: 0,
        period_start: periodStart,
        period_end: periodEnd,
        community_platform_moderator_id: moderator.id,
      } satisfies ICommunityPlatformVoteLimit.ICreate,
    });
  typia.assert(voteLimit);

  // Step 4: Validate the created voting limit
  TestValidator.equals(
    "vote limit actor type should be moderator",
    voteLimit.actor_type,
    "moderator",
  );
  TestValidator.equals(
    "vote limit type should be hourly",
    voteLimit.limit_type,
    "hourly",
  );
  TestValidator.equals(
    "vote limit moderator reference should match",
    voteLimit.community_platform_moderator_id,
    moderator.id,
  );
  TestValidator.equals(
    "current count should be initialized to 0",
    voteLimit.current_count,
    0,
  );
  TestValidator.predicate(
    "max votes should be positive",
    voteLimit.max_votes > 0,
  );
  TestValidator.predicate(
    "period start should be valid date",
    new Date(voteLimit.period_start).getTime() > 0,
  );
  TestValidator.predicate(
    "period end should be valid date",
    new Date(voteLimit.period_end).getTime() > 0,
  );
  TestValidator.predicate(
    "period end should be after period start",
    new Date(voteLimit.period_end).getTime() >
      new Date(voteLimit.period_start).getTime(),
  );
}
