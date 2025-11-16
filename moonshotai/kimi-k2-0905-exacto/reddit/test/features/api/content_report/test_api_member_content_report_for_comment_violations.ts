import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test member creation of content reports targeting comments within post
 * discussions. Validates that members can report individual comments that
 * violate platform policies with appropriate categorization and contextual
 * explanation. Tests that comment reporting integrates with the moderation
 * system while preserving thread structure and preventing duplicate reports
 * from the same member for identical content.
 */
export async function test_api_member_content_report_for_comment_violations(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a community to provide discussion forum context
  const community =
    await api.functional.redditCommunity.member.communities.create(connection, {
      body: {
        name: RandomGenerator.alphabets(8).toLowerCase(),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_name: "Technology",
        type: "public",
      } satisfies IRedditCommunityCommunity.ICreate,
    });
  typia.assert(community);

  // Step 3: Create a post within the community
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        reddit_community_id: community.id,
        reddit_post_type_id: typia.random<string>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 4: Create a comment on the post to be reported
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          reddit_post_id: post.id,
          href: "https://example.com/post/123",
          referrer: "https://example.com/",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 5: Submit a content report for the comment with violation details
  const reportReason =
    "This comment contains inappropriate content that violates community guidelines regarding respectful communication";
  const report =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: reportReason,
          report_category: "harassment",
          content_type: "comment",
          comment_id: comment.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report);

  // Step 6: Verify the report was created successfully with proper metadata
  TestValidator.equals(
    "report status should be submitted",
    report.status,
    "submitted",
  );
  TestValidator.equals(
    "report should target correct comment",
    report.reported_comment?.id,
    comment.id,
  );
  TestValidator.equals(
    "report should have correct reporter",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "report reason should match input",
    report.report_reason,
    reportReason,
  );
  TestValidator.equals(
    "report should have harassment category",
    report.report_category,
    "harassment",
  );
  TestValidator.predicate(
    "report should have creation timestamp",
    typeof report.reported_at === "string" && report.reported_at.length > 0,
  );

  // Step 7: Test duplicate report prevention - attempt to report same comment again
  await TestValidator.error(
    "duplicate report should be prevented",
    async () => {
      await api.functional.redditCommunity.member.contentReports.create(
        connection,
        {
          body: {
            report_reason: "Attempting duplicate report",
            report_category: "spam",
            content_type: "comment",
            comment_id: comment.id,
          } satisfies IRedditCommunityContentReport.ICreate,
        },
      );
    },
  );

  // Step 8: Create a different report to test multiple users can report same content
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: member2Email,
      password: "SecurePassword456!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member2);

  const report2Reason =
    "This comment promotes harmful messaging towards other community members";
  const report2 =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: report2Reason,
          report_category: "hate_speech",
          content_type: "comment",
          comment_id: comment.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(report2);

  // Verify both reports exist for the comment but from different reporters
  TestValidator.equals(
    "second report should also target comment",
    report2.reported_comment?.id,
    comment.id,
  );
  TestValidator.notEquals(
    "reports should have different reporters",
    report.reporter.id,
    report2.reporter.id,
  );
  TestValidator.notEquals(
    "reports should have different reasons",
    report.report_reason,
    report2.report_reason,
  );
  TestValidator.notEquals(
    "reports should have different categories",
    report.report_category,
    report2.report_category,
  );

  // Validate thread structure preservation - comment should still be accessible
  TestValidator.equals(
    "comment should maintain its content",
    report2.reported_comment?.content,
    comment.content,
  );
  TestValidator.equals(
    "comment should maintain its author",
    report2.reported_comment?.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "comment thread depth should be preserved",
    report2.reported_comment?.thread_depth,
    comment.thread_depth,
  );
}
