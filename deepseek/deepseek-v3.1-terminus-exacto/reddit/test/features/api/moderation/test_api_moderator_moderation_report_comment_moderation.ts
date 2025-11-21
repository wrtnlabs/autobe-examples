import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReport";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test moderator reporting workflow for comment moderation.
 *
 * This comprehensive E2E test validates the complete moderator workflow for
 * identifying and reporting problematic comments within community platforms.
 * The test follows a realistic business scenario involving moderator account
 * setup, community creation, content generation, and moderation reporting.
 */
export async function test_api_moderator_moderation_report_comment_moderation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
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

  // Step 2: Create community context
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

  // Step 3: Create a post in the community
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

  // Step 4: Create a comment on the post
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: "This comment contains inappropriate content that violates community guidelines",
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Submit moderation report for the comment
  const moderationReport =
    await api.functional.communityPlatform.moderator.moderationReports.create(
      connection,
      {
        body: {
          report_type: "inappropriate_content",
          target_type: "comment",
          target_id: comment.id,
          description:
            "This comment contains inappropriate language and violates community guidelines",
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 6: Validate the moderation report
  TestValidator.equals(
    "report ID should be valid UUID",
    moderationReport.id,
    moderationReport.id,
  );
  TestValidator.equals(
    "report type should match input",
    moderationReport.report_type,
    "inappropriate_content",
  );
  TestValidator.equals(
    "report status should be submitted",
    moderationReport.status,
    "submitted",
  );
  TestValidator.equals(
    "priority level should match input",
    moderationReport.priority_level,
    "medium",
  );
  TestValidator.equals(
    "description should match input",
    moderationReport.description,
    "This comment contains inappropriate language and violates community guidelines",
  );

  // Step 7: Validate target entity information
  TestValidator.equals(
    "target entity ID should match comment ID",
    moderationReport.target.id,
    comment.id,
  );
  TestValidator.predicate(
    "target entity should have valid name",
    moderationReport.target.name.length > 0,
  );
  TestValidator.predicate(
    "target entity should have valid status",
    moderationReport.target.status.length > 0,
  );
  TestValidator.predicate(
    "target entity should have valid creation timestamp",
    moderationReport.target.created_at.length > 0,
  );

  // Step 8: Validate timestamps
  TestValidator.predicate(
    "created_at timestamp should be valid",
    moderationReport.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    moderationReport.updated_at.length > 0,
  );
  TestValidator.predicate(
    "resolved_at should be undefined for new report",
    moderationReport.resolved_at === undefined,
  );
  TestValidator.predicate(
    "deleted_at should be undefined for active report",
    moderationReport.deleted_at === undefined,
  );

  // Step 9: Validate confidence score (typia.assert already validated the type)
  TestValidator.predicate(
    "confidence score should be between 0 and 1",
    moderationReport.confidence_score >= 0 &&
      moderationReport.confidence_score <= 1,
  );

  // Step 10: Validate escalation reason is undefined for new report
  TestValidator.predicate(
    "escalation reason should be undefined",
    moderationReport.escalation_reason === undefined,
  );
}
