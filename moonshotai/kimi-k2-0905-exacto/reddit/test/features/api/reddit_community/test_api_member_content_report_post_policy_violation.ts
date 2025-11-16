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
 * Test community member reporting a post that violates community guidelines or
 * platform policies. Validates that members can successfully submit content
 * reports with appropriate violation categories, detailed explanations, and
 * proper content targeting. This scenario ensures the community-driven
 * moderation system works effectively for identifying and flagging
 * policy-violating content.
 *
 * The test follows this workflow:
 *
 * 1. Create a new member account to authenticate the reporting user
 * 2. Create a test post that will be reported for policy violations
 * 3. Submit a content report with specified violation category and detailed
 *    explanation
 * 4. Verify that the report was created successfully with proper relationships and
 *    status
 */
export async function test_api_member_content_report_post_policy_violation(
  connection: api.IConnection,
) {
  // 1. Create a new member account for reporting
  const memberData = {
    nickname: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
  } satisfies IRedditCommunityMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  TestValidator.predicate("member account created successfully", !!member.id);

  // 2. Create a test post to report
  const postData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 6,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: postData,
    },
  );
  typia.assert(post);

  TestValidator.predicate("post created successfully", !!post.id);

  // 3. Submit a content report for policy violation
  const reportData = {
    report_reason:
      "This post contains inappropriate content that violates community guidelines regarding respectful discourse and appropriate language within our community.",
    report_category: "harassment",
    content_type: "post" as const,
    post_id: post.id,
  } satisfies IRedditCommunityContentReport.ICreate;

  const report =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: reportData,
      },
    );
  typia.assert(report);

  // 4. Validate the content report was created successfully
  TestValidator.equals(
    "report reason matches submission",
    report.report_reason,
    reportData.report_reason,
  );
  TestValidator.equals(
    "report category matches submission",
    report.report_category,
    reportData.report_category,
  );
  TestValidator.equals(
    "report status is submitted",
    report.status,
    "submitted",
  );
  TestValidator.predicate(
    "report has proper reporter information",
    !!report.reporter.id,
  );
  TestValidator.predicate(
    "report has proper reported member information",
    !!report.reported_member.id,
  );
  TestValidator.predicate(
    "report targets the correct post",
    report.reported_post?.id === post.id,
  );
  TestValidator.predicate(
    "report has reporting timestamp",
    !!report.reported_at,
  );
  TestValidator.equals(
    "reporter ID matches member",
    report.reporter.id,
    member.id,
  );
  TestValidator.equals(
    "reported member ID matches post author",
    report.reported_member.id,
    post.author.id,
  );
}
