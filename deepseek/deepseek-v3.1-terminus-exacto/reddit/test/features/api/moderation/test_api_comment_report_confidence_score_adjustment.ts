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
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserBan";

/**
 * Test updating the confidence score of a comment report based on additional
 * evidence or moderation assessment.
 *
 * This comprehensive E2E test validates the complete moderation workflow from
 * content creation through report submission and confidence score adjustment.
 * It ensures that confidence score updates are properly recorded and influence
 * moderation prioritization appropriately throughout the moderation workflow.
 */
export async function test_api_comment_report_confidence_score_adjustment(
  connection: api.IConnection,
) {
  // 1. Create member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create community to host content
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

  // 3. Create post within the community for comment context
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        status: "published",
        community_platform_community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 4. Create comment that will be reported for moderation
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(comment);

  // 5. Create initial report with baseline confidence score
  const initialReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_type: "inappropriate_content",
          target_type: "comment",
          target_id: comment.id,
          description: RandomGenerator.content({ paragraphs: 1 }),
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(initialReport);

  // 6. Update the confidence score to reflect new information or automated assessment
  const updatedReport: ICommunityPlatformModerationReport =
    await api.functional.communityPlatform.member.comments.reports.update(
      connection,
      {
        commentId: comment.id,
        reportId: initialReport.id,
        body: {
          confidence_score: 0.85,
          priority_level: "high",
          description:
            "Additional evidence confirms violation - confidence increased",
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(updatedReport);

  // 7. Validate that confidence score updates are properly recorded
  TestValidator.equals(
    "confidence score should be updated",
    updatedReport.confidence_score,
    0.85,
  );

  TestValidator.notEquals(
    "confidence score should differ from initial value",
    updatedReport.confidence_score,
    initialReport.confidence_score,
  );

  TestValidator.equals(
    "priority level should be updated to reflect higher confidence",
    updatedReport.priority_level,
    "high",
  );

  TestValidator.notEquals(
    "priority level should differ from initial value",
    updatedReport.priority_level,
    initialReport.priority_level,
  );

  TestValidator.equals(
    "report ID should remain consistent",
    updatedReport.id,
    initialReport.id,
  );

  TestValidator.equals(
    "comment ID association should remain consistent",
    updatedReport.target.id,
    comment.id,
  );

  // 8. Verify that updated scores influence moderation prioritization appropriately
  TestValidator.predicate(
    "updated report should have higher confidence than initial",
    updatedReport.confidence_score > initialReport.confidence_score,
  );

  TestValidator.predicate(
    "high confidence should correlate with high priority level",
    updatedReport.confidence_score > 0.7 &&
      updatedReport.priority_level === "high",
  );
}
