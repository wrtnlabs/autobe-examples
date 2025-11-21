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
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Validates moderator access to moderation report details for content within
 * assigned communities.
 *
 * This test simulates a complete moderation workflow: member creates community
 * and post, submits moderation report, then moderator retrieves and verifies
 * report details. Ensures proper authentication context switching and validates
 * moderator-level access controls.
 */
export async function test_api_moderation_report_moderator_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation and reporting
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

  // Step 2: Create community as target entity for moderation activities
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post within community as specific target for moderation report
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Submit moderation report against the created post
  const moderationReport =
    await api.functional.communityPlatform.member.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "post",
          target_id: post.id,
          description: RandomGenerator.content({ paragraphs: 2 }),
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 5: Create moderator account with content management privileges
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 6: Switch authentication context to moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Moderator retrieves the moderation report details
  const retrievedReport =
    await api.functional.communityPlatform.moderator.moderationReports.at(
      connection,
      {
        moderationReportId: moderationReport.id,
      },
    );
  typia.assert(retrievedReport);

  // Step 8: Validate retrieved report matches original submission
  TestValidator.equals(
    "report ID matches",
    retrievedReport.id,
    moderationReport.id,
  );
  TestValidator.equals(
    "report type matches",
    retrievedReport.report_type,
    "inappropriate_content",
  );
  TestValidator.equals(
    "description matches",
    retrievedReport.description,
    moderationReport.description,
  );
  TestValidator.equals(
    "priority level matches",
    retrievedReport.priority_level,
    "medium",
  );

  // Step 9: Validate report status and timestamps
  TestValidator.equals(
    "report status is submitted",
    retrievedReport.status,
    "submitted",
  );
  TestValidator.predicate(
    "confidence score is valid",
    retrievedReport.confidence_score >= 0 &&
      retrievedReport.confidence_score <= 1,
  );
  TestValidator.predicate(
    "created at timestamp exists",
    retrievedReport.created_at !== null &&
      retrievedReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    retrievedReport.updated_at !== null &&
      retrievedReport.updated_at !== undefined,
  );

  // Step 10: Validate target entity information
  TestValidator.predicate(
    "target entity has valid ID",
    retrievedReport.target.id !== null &&
      retrievedReport.target.id !== undefined,
  );
  TestValidator.predicate(
    "target entity has valid name",
    retrievedReport.target.name !== null &&
      retrievedReport.target.name !== undefined,
  );
  TestValidator.predicate(
    "target entity has valid status",
    retrievedReport.target.status !== null &&
      retrievedReport.target.status !== undefined,
  );
  TestValidator.predicate(
    "target entity has creation timestamp",
    retrievedReport.target.created_at !== null &&
      retrievedReport.target.created_at !== undefined,
  );
}
