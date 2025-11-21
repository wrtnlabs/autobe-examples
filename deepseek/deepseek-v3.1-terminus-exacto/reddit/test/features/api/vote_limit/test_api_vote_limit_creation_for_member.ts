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
 * Test that administrators can create voting limits for community members to
 * prevent vote manipulation. Validates the complete workflow of establishing
 * voting restrictions including member authentication, community creation, and
 * limit configuration. The scenario tests different limit types (hourly, daily,
 * content_type) and ensures proper relationship mapping between the voting
 * limit and the target member.
 */
export async function test_api_vote_limit_creation_for_member(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for limit creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      display_name: RandomGenerator.name(),
      admin_level: "system",
      is_super_admin: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create member account to apply voting limits to
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create community for member context
  const community =
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

  // Step 4: Create different types of voting limits for the member
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Test hourly limit
  const hourlyLimit =
    await api.functional.communityPlatform.admin.voteLimits.create(connection, {
      body: {
        actor_type: "member",
        limit_type: "hourly",
        max_votes: 10,
        current_count: 0,
        period_start: now.toISOString(),
        period_end: oneHourLater.toISOString(),
        community_platform_member_id: member.id,
      } satisfies ICommunityPlatformVoteLimit.ICreate,
    });
  typia.assert(hourlyLimit);
  TestValidator.equals(
    "hourly limit actor_type should be member",
    hourlyLimit.actor_type,
    "member",
  );
  TestValidator.equals(
    "hourly limit limit_type should be hourly",
    hourlyLimit.limit_type,
    "hourly",
  );
  TestValidator.equals(
    "hourly limit max_votes should be 10",
    hourlyLimit.max_votes,
    10,
  );
  TestValidator.equals(
    "hourly limit current_count should be 0",
    hourlyLimit.current_count,
    0,
  );

  // Test daily limit
  const dailyLimit =
    await api.functional.communityPlatform.admin.voteLimits.create(connection, {
      body: {
        actor_type: "member",
        limit_type: "daily",
        max_votes: 50,
        current_count: 0,
        period_start: now.toISOString(),
        period_end: oneDayLater.toISOString(),
        community_platform_member_id: member.id,
      } satisfies ICommunityPlatformVoteLimit.ICreate,
    });
  typia.assert(dailyLimit);
  TestValidator.equals(
    "daily limit actor_type should be member",
    dailyLimit.actor_type,
    "member",
  );
  TestValidator.equals(
    "daily limit limit_type should be daily",
    dailyLimit.limit_type,
    "daily",
  );
  TestValidator.equals(
    "daily limit max_votes should be 50",
    dailyLimit.max_votes,
    50,
  );

  // Test content_type limit
  const contentTypeLimit =
    await api.functional.communityPlatform.admin.voteLimits.create(connection, {
      body: {
        actor_type: "member",
        limit_type: "content_type",
        max_votes: 5,
        current_count: 0,
        period_start: now.toISOString(),
        period_end: oneDayLater.toISOString(),
        community_platform_member_id: member.id,
      } satisfies ICommunityPlatformVoteLimit.ICreate,
    });
  typia.assert(contentTypeLimit);
  TestValidator.equals(
    "content_type limit actor_type should be member",
    contentTypeLimit.actor_type,
    "member",
  );
  TestValidator.equals(
    "content_type limit limit_type should be content_type",
    contentTypeLimit.limit_type,
    "content_type",
  );
  TestValidator.equals(
    "content_type limit max_votes should be 5",
    contentTypeLimit.max_votes,
    5,
  );

  // Verify member relationship in all created limits
  TestValidator.equals(
    "hourly limit should reference correct member",
    hourlyLimit.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "daily limit should reference correct member",
    dailyLimit.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "content_type limit should reference correct member",
    contentTypeLimit.community_platform_member_id,
    member.id,
  );

  // Verify period timestamps are properly set
  TestValidator.predicate(
    "period_start should be valid date",
    new Date(hourlyLimit.period_start).getTime() > 0,
  );
  TestValidator.predicate(
    "period_end should be after period_start",
    new Date(hourlyLimit.period_end).getTime() >
      new Date(hourlyLimit.period_start).getTime(),
  );

  // Verify all limits have unique IDs
  TestValidator.notEquals(
    "hourly and daily limits should have different IDs",
    hourlyLimit.id,
    dailyLimit.id,
  );
  TestValidator.notEquals(
    "hourly and content_type limits should have different IDs",
    hourlyLimit.id,
    contentTypeLimit.id,
  );
  TestValidator.notEquals(
    "daily and content_type limits should have different IDs",
    dailyLimit.id,
    contentTypeLimit.id,
  );
}
