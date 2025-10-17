import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test the automatic high-priority flagging system for content reports.
 *
 * This test validates that when multiple users (5+) report the same content
 * within 24 hours, the system automatically flags the content as high priority
 * for expedited moderator review.
 *
 * Steps:
 *
 * 1. Create content author member account
 * 2. Create a community for the post
 * 3. Create a post that will be reported
 * 4. Create 5 reporter member accounts
 * 5. Each reporter submits a content report for the same post
 * 6. Validate high-priority flagging after threshold is reached
 */
export async function test_api_content_report_high_priority_flagging(
  connection: api.IConnection,
) {
  // Step 1: Create content author member account
  const authorEmail = typia.random<string & tags.Format<"email">>();
  const author = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: authorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(author);

  // Step 2: Create community for the post
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(15),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create a post that will be reported
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({ sentences: 2 }),
      body: RandomGenerator.content({ paragraphs: 2 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4-5: Create 5 reporter accounts and submit reports
  const reporterCount = 5;
  const reports = await ArrayUtil.asyncRepeat(reporterCount, async (index) => {
    // Create reporter member account
    const reporterEmail = typia.random<string & tags.Format<"email">>();
    const reporter = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: reporterEmail,
        password: typia.random<string & tags.MinLength<8>>(),
      } satisfies IRedditLikeMember.ICreate,
    });
    typia.assert(reporter);

    // Submit content report for the post
    const report = await api.functional.redditLike.content_reports.create(
      connection,
      {
        body: {
          reported_post_id: post.id,
          community_id: community.id,
          content_type: "post",
          violation_categories: "spam,harassment",
          additional_context: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeContentReport.ICreate,
      },
    );
    typia.assert(report);

    return report;
  });

  // Step 6: Validate that reports were created successfully
  TestValidator.equals("all reports created", reports.length, reporterCount);

  // Validate that the last report (5th report reaching threshold) has high-priority flag
  const lastReport = reports[reports.length - 1];
  typia.assert(lastReport);
  TestValidator.equals(
    "high priority flag set after reaching threshold",
    lastReport.is_high_priority,
    true,
  );

  // Validate report properties
  for (const report of reports) {
    TestValidator.equals("report content type", report.content_type, "post");
    TestValidator.equals("report status", report.status, "pending");
  }
}
