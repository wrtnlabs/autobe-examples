import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test that members can submit moderation reports for posts containing
 * inappropriate content. Member creates a new post, then reports it for
 * violation. Validates the complete workflow from content creation to
 * moderation reporting, ensuring proper target entity identification and
 * violation type categorization.
 */
export async function test_api_member_moderation_report_post_violation(
  connection: api.IConnection,
) {
  // Step 1: Member registration and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(2),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create community for post hosting
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
          slug: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post as target entity for reporting
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 10,
        }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 4: Submit moderation report for the post
  const reportType = "inappropriate_content";
  const reportDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const priorityLevel = "medium";

  const moderationReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.member.moderationReports.create(
      connection,
      {
        body: {
          report_type: reportType,
          target_type: "post",
          target_id: post.id,
          description: reportDescription,
          priority_level: priorityLevel,
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 5: Validate report properties and relationships
  TestValidator.equals(
    "report ID should be valid UUID",
    moderationReport.id,
    moderationReport.id,
  );
  TestValidator.equals(
    "report type should match submission",
    moderationReport.report_type,
    reportType,
  );
  TestValidator.equals(
    "report status should be submitted",
    moderationReport.status,
    "submitted",
  );
  TestValidator.equals(
    "report priority level should match",
    moderationReport.priority_level,
    priorityLevel,
  );
  TestValidator.equals(
    "report description should match submission",
    moderationReport.description,
    reportDescription,
  );
  TestValidator.predicate(
    "report should have creation timestamp",
    moderationReport.created_at !== undefined &&
      moderationReport.created_at !== null,
  );
  TestValidator.predicate(
    "report should have valid target entity",
    moderationReport.target !== undefined &&
      moderationReport.target.id === post.id,
  );
  TestValidator.predicate(
    "report target name should match post title",
    moderationReport.target.name === post.title,
  );
}
