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
 * Test the complete workflow of a member reporting an inappropriate comment.
 *
 * This E2E test validates the entire moderation reporting flow starting from
 * member registration through comment creation and final report submission. It
 * ensures that reports are properly created with correct violation details and
 * enter the moderation workflow queue with appropriate tracking information.
 */
export async function test_api_comment_report_creation_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://community-platform.example.com/register",
      referrer: "https://community-platform.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to host content for testing
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

  // Step 3: Create a post within the community for comment context
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

  // Step 4: Create a comment that will be reported for moderation
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

  // Step 5: Report the comment for moderation
  const reportType = "inappropriate_content";
  const reportDescription =
    "This comment contains inappropriate language and violates community guidelines.";
  const priorityLevel = "medium";

  const moderationReport =
    await api.functional.communityPlatform.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: {
          report_type: reportType,
          target_type: "comment",
          target_id: comment.id,
          description: reportDescription,
          priority_level: priorityLevel,
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(moderationReport);

  // Step 6: Validate the report was properly created
  TestValidator.equals(
    "report ID should be valid UUID",
    typeof moderationReport.id,
    "string",
  );
  TestValidator.equals(
    "report type should match input",
    moderationReport.report_type,
    reportType,
  );
  TestValidator.equals(
    "report description should match input",
    moderationReport.description,
    reportDescription,
  );
  TestValidator.equals(
    "report priority level should match input",
    moderationReport.priority_level,
    priorityLevel,
  );
  TestValidator.predicate(
    "report should have creation timestamp",
    moderationReport.created_at !== undefined,
  );
  TestValidator.predicate(
    "report status should be submitted",
    moderationReport.status === "submitted",
  );

  // Additional validation: Test error scenario for non-existent comment
  await TestValidator.error(
    "reporting non-existent comment should fail",
    async () => {
      await api.functional.communityPlatform.member.comments.reports.create(
        connection,
        {
          commentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            report_type: "spam",
            target_type: "comment",
            target_id: typia.random<string & tags.Format<"uuid">>(),
            description: "Test spam report",
            priority_level: "low",
          } satisfies ICommunityPlatformModerationReport.ICreate,
        },
      );
    },
  );
}
