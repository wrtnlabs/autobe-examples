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
 * Test the complete lifecycle of a comment report through various status
 * transitions.
 *
 * This comprehensive E2E test validates the moderation workflow for comment
 * reports on a community platform. The test follows a complete business flow
 * from member registration through comment creation, reporting, and multiple
 * status updates.
 */
export async function test_api_comment_report_status_transition_workflow(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
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

  // Step 2: Create community
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

  // Step 5: Create initial moderation report
  const initialReport =
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

  // Validate initial report state
  TestValidator.equals(
    "initial report status should be submitted",
    initialReport.status,
    "submitted",
  );
  TestValidator.equals(
    "initial report type should match",
    initialReport.report_type,
    "inappropriate_content",
  );

  // Step 6: Update report status through valid workflow stages
  const statusTransitions = [
    { status: "under_review", description: "Reviewing the reported content" },
    { status: "action_taken", description: "Action taken against the comment" },
    { status: "dismissed", description: "Report dismissed as invalid" },
    {
      status: "escalated",
      description: "Report escalated to higher authority",
    },
  ] as const;

  for (const transition of statusTransitions) {
    const updatedReport =
      await api.functional.communityPlatform.member.comments.reports.update(
        connection,
        {
          commentId: comment.id,
          reportId: initialReport.id,
          body: {
            status: transition.status,
            description: transition.description,
          } satisfies ICommunityPlatformModerationReport.IUpdate,
        },
      );
    typia.assert(updatedReport);

    // Validate status transition
    TestValidator.equals(
      `report status should be ${transition.status}`,
      updatedReport.status,
      transition.status,
    );
    TestValidator.equals(
      "report ID should remain consistent",
      updatedReport.id,
      initialReport.id,
    );
    TestValidator.equals(
      "report type should remain unchanged",
      updatedReport.report_type,
      initialReport.report_type,
    );

    // Validate timestamp updates
    TestValidator.predicate(
      "updated_at should be after creation",
      new Date(updatedReport.updated_at) > new Date(initialReport.created_at),
    );
  }

  // Final validation: Test updating with multiple fields simultaneously
  const comprehensiveUpdate =
    await api.functional.communityPlatform.member.comments.reports.update(
      connection,
      {
        commentId: comment.id,
        reportId: initialReport.id,
        body: {
          status: "under_review",
          description: "Comprehensive update test",
          priority_level: "high",
          confidence_score: 0.9,
        } satisfies ICommunityPlatformModerationReport.IUpdate,
      },
    );
  typia.assert(comprehensiveUpdate);

  TestValidator.equals(
    "comprehensive update should reflect all changes",
    comprehensiveUpdate.status,
    "under_review",
  );
  TestValidator.equals(
    "priority level should be updated",
    comprehensiveUpdate.priority_level,
    "high",
  );
}
