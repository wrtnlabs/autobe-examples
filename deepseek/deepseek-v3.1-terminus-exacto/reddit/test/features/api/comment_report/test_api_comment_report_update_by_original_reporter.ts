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
 * Test updating an existing comment report by the original reporter with
 * additional information or status changes.
 *
 * This comprehensive E2E test validates the complete moderation workflow:
 *
 * 1. Create member account for authentication context
 * 2. Create community to host content for testing
 * 3. Create post within the community for comment context
 * 4. Create comment that will be reported for moderation
 * 5. Create initial report that will be updated
 * 6. Update the report with new description details and priority level adjustments
 * 7. Validate that the reporter can modify their own report
 * 8. Verify that updates are properly recorded with timestamps
 * 9. Ensure moderation workflow reflects updated information while preserving
 *    original context
 */
export async function test_api_comment_report_update_by_original_reporter(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "securePassword123",
      display_name: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community to host content
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

  // Step 3: Create post within the community
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

  // Step 4: Create comment that will be reported
  const comment = await api.functional.communityPlatform.member.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content({ paragraphs: 1 }),
        community_platform_post_id: post.id,
        status: "published",
      } satisfies ICommunityPlatformComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Create initial report
  const initialReport =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_type: "inappropriate_content",
          target_type: "comment",
          target_id: comment.id,
          description: "Initial report description",
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(initialReport);

  // Step 6: Update the report with new information
  const updatedReport =
    await api.functional.communityPlatform.member.comments.reports.update(
      connection,
      {
        commentId: comment.id,
        reportId: initialReport.id,
        body: {
          report_type: "harassment",
          description: "Updated report description with more details",
          priority_level: "high",
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(updatedReport);

  // Step 7: Validate that the reporter can modify their own report
  TestValidator.equals(
    "report ID remains the same after update",
    updatedReport.id,
    initialReport.id,
  );

  // Step 8: Verify that updates are properly recorded
  TestValidator.notEquals(
    "updated report type differs from initial",
    updatedReport.report_type,
    initialReport.report_type,
  );

  TestValidator.notEquals(
    "updated description differs from initial",
    updatedReport.description,
    initialReport.description,
  );

  TestValidator.notEquals(
    "updated priority level differs from initial",
    updatedReport.priority_level,
    initialReport.priority_level,
  );

  TestValidator.predicate(
    "updated report has later timestamp than initial report",
    new Date(updatedReport.updated_at) > new Date(initialReport.updated_at),
  );

  // Step 9: Ensure moderation workflow preserves original context
  TestValidator.equals(
    "target entity remains consistent",
    updatedReport.target.id,
    initialReport.target.id,
  );

  TestValidator.equals(
    "target entity name remains consistent",
    updatedReport.target.name,
    initialReport.target.name,
  );

  TestValidator.predicate(
    "report status remains valid after update",
    typeof updatedReport.status === "string" && updatedReport.status.length > 0,
  );

  TestValidator.predicate(
    "confidence score remains valid after update",
    typeof updatedReport.confidence_score === "number" &&
      updatedReport.confidence_score >= 0 &&
      updatedReport.confidence_score <= 1,
  );

  // Additional validation: Ensure the update operation preserves essential fields
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedReport.created_at,
    initialReport.created_at,
  );

  TestValidator.predicate(
    "updated report has valid escalation reason field",
    updatedReport.escalation_reason === null ||
      updatedReport.escalation_reason === undefined ||
      typeof updatedReport.escalation_reason === "string",
  );

  // Additional test: Validate error handling for non-existent report
  await TestValidator.error(
    "updating non-existent report should fail",
    async () => {
      await api.functional.communityPlatform.member.comments.reports.update(
        connection,
        {
          commentId: comment.id,
          reportId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            description: "Attempting to update non-existent report",
          } satisfies ICommunityPlatformModerationReport.IUpdate,
        },
      );
    },
  );

  // Additional test: Validate partial updates work correctly
  const partialUpdateReport =
    await api.functional.communityPlatform.member.comments.reports.update(
      connection,
      {
        commentId: comment.id,
        reportId: initialReport.id,
        body: {
          description: "Partial update with only description changed",
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(partialUpdateReport);

  TestValidator.equals(
    "partial update preserves report type",
    partialUpdateReport.report_type,
    updatedReport.report_type,
  );

  TestValidator.notEquals(
    "partial update changes description",
    partialUpdateReport.description,
    updatedReport.description,
  );

  TestValidator.equals(
    "partial update preserves priority level",
    partialUpdateReport.priority_level,
    updatedReport.priority_level,
  );
}
