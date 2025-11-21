import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderator escalation reporting for community-level violations.
 *
 * This comprehensive E2E test validates the complete workflow of a moderator
 * reporting a community for escalation to higher authorities. The test ensures
 * that moderator escalation capabilities work correctly for community-level
 * violations and that the workflow supports proper escalation procedures.
 */
export async function test_api_moderator_moderation_report_community_escalation(
  connection: api.IConnection,
) {
  // Step 1: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create target community entity as member
  const community =
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

  // Step 3: Authenticate as moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "global",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Submit moderation report with escalation as moderator
  const escalationReport =
    await api.functional.communityPlatform.moderator.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "community",
          target_id: community.id,
          description:
            "Community contains inappropriate content requiring escalation to higher authorities",
          priority_level: "high",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(escalationReport);

  // Step 5: Validate escalation report properties
  TestValidator.notEquals(
    "report ID should be different from community ID",
    escalationReport.id,
    community.id,
  );
  TestValidator.equals(
    "report type should match",
    escalationReport.report_type,
    "inappropriate_content",
  );
  TestValidator.equals(
    "report status should be submitted",
    escalationReport.status,
    "submitted",
  );
  TestValidator.equals(
    "priority level should be high",
    escalationReport.priority_level,
    "high",
  );
  TestValidator.equals(
    "target ID should match community ID",
    escalationReport.target.id,
    community.id,
  );
  TestValidator.equals(
    "target name should match community name",
    escalationReport.target.name,
    community.name,
  );
  TestValidator.equals(
    "target status should match community status",
    escalationReport.target.status,
    community.status,
  );
  TestValidator.predicate(
    "confidence score should be valid",
    escalationReport.confidence_score >= 0 &&
      escalationReport.confidence_score <= 1,
  );
  TestValidator.predicate(
    "created at timestamp should be valid",
    escalationReport.created_at !== null &&
      escalationReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp should be valid",
    escalationReport.updated_at !== null &&
      escalationReport.updated_at !== undefined,
  );
  TestValidator.predicate(
    "description should contain escalation context",
    escalationReport.description.includes("escalation"),
  );
}
