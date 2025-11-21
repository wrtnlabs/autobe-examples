import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test community-level moderation reporting for spam content.
 *
 * Validates the complete workflow where a member creates a community, then
 * reports it for spam violations. Ensures proper moderation workflow initiation
 * for community-level violations.
 */
export async function test_api_member_moderation_report_community_spam(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member user
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a target community entity
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 2 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Submit moderation report for spam violation
  const moderationReport =
    await api.functional.communityPlatform.member.moderationReports.create(
      connection,
      {
        body: {
          report_type: "spam",
          target_type: "community",
          target_id: community.id,
          description:
            "This community appears to be spam content with automated postings",
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 4: Validate the moderation report response
  TestValidator.equals(
    "report type should be spam",
    moderationReport.report_type,
    "spam",
  );
  TestValidator.equals(
    "report status should be submitted",
    moderationReport.status,
    "submitted",
  );
  TestValidator.predicate(
    "confidence score should be a number between 0 and 1",
    moderationReport.confidence_score >= 0 &&
      moderationReport.confidence_score <= 1,
  );
  TestValidator.equals(
    "target ID should match the reported community",
    moderationReport.target.id,
    community.id,
  );
  TestValidator.equals(
    "target name should match the community name",
    moderationReport.target.name,
    community.name,
  );
}
