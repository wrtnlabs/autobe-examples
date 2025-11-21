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
 * Test moderation reporting workflow for comments containing harassment.
 *
 * This comprehensive E2E test validates the complete workflow where a member
 * creates a community, posts content, adds a comment, and then reports the
 * comment for harassment. The test ensures proper nested content reporting
 * capabilities and validates that comment identification works correctly in
 * moderation workflows.
 */
export async function test_api_member_moderation_report_comment_harassment(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member
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
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.content({ paragraphs: 1 }),
          privacy: "public",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post
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

  // Step 4: Create comment
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

  // Step 5: Submit moderation report for harassment
  const report =
    await api.functional.communityPlatform.member.moderationReports.create(
      connection,
      {
        body: {
          report_type: "harassment",
          target_type: "comment",
          target_id: comment.id,
          description:
            "This comment contains harassing content that violates community guidelines",
          priority_level: "medium",
        } satisfies ICommunityPlatformModerationReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Validate report structure and relationships
  TestValidator.equals(
    "report ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.id,
    ),
    true,
  );
  TestValidator.equals(
    "report type should be harassment",
    report.report_type,
    "harassment",
  );
  TestValidator.equals(
    "report description should match input",
    report.description,
    "This comment contains harassing content that violates community guidelines",
  );
  TestValidator.equals(
    "report priority level should be medium",
    report.priority_level,
    "medium",
  );
  TestValidator.equals(
    "report status should be submitted",
    report.status,
    "submitted",
  );
  TestValidator.predicate(
    "report should have creation timestamp",
    report.created_at !== undefined,
  );
  TestValidator.predicate(
    "report confidence score should be initialized",
    report.confidence_score !== undefined,
  );
}
