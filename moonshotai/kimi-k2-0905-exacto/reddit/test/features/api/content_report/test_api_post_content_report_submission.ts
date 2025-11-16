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
 * Test comprehensive content report submission where a member reports
 * inappropriate post content. This scenario validates the complete reporting
 * workflow including violation category selection, detailed reasoning, target
 * content identification, and report status initialization. Tests that members
 * can only report content they have access to view and that duplicate reports
 * are prevented.
 */
export async function test_api_post_content_report_submission(
  connection: api.IConnection,
) {
  // Create first member (post author)
  const authorMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" satisfies string & tags.Format<"password">,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(authorMember);

  // Create second member (reporter)
  const reporterMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!" satisfies string & tags.Format<"password">,
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(reporterMember);

  // Create first post (text post)
  const textPostData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 4,
      wordMax: 8,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const textPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: textPostData,
    },
  );
  typia.assert(textPost);

  // Create second post (link post)
  const linkPostData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 7 }),
    link_url: "https://example.com/inappropriate-content" satisfies string &
      tags.Format<"uri">,
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: linkPostData,
    },
  );
  typia.assert(linkPost);

  // Create third post for duplicate report testing
  const duplicateTestPostData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 6, wordMax: 12 }),
    content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 4,
      wordMin: 5,
      wordMax: 9,
    }),
    reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
    reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IRedditCommunityPost.ICreate;

  const duplicateTestPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: duplicateTestPostData,
    });
  typia.assert(duplicateTestPost);

  // Submit first content report (harassment category)
  const harassmentReportData = {
    report_reason:
      "This post contains offensive language and targeted harassment towards a specific individual or group",
    report_category: "harassment",
    content_type: "post" as const,
    post_id: textPost.id,
  } satisfies IRedditCommunityContentReport.ICreate;

  const harassmentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: harassmentReportData,
      },
    );
  typia.assert(harassmentReport);

  // Validate harassment report properties
  TestValidator.equals(
    "harassment report reason",
    harassmentReport.report_reason,
    harassmentReportData.report_reason,
  );
  TestValidator.equals(
    "harassment report category",
    harassmentReport.report_category,
    harassmentReportData.report_category,
  );
  TestValidator.equals(
    "harassment report status",
    harassmentReport.status,
    "submitted",
  );
  TestValidator.equals(
    "harassment report post ID",
    harassmentReport.reported_post?.id,
    textPost.id,
  );
  TestValidator.equals(
    "harassment report reporter",
    harassmentReport.reporter.id,
    reporterMember.id,
  );

  // Submit second content report (spam category)
  const spamReportData = {
    report_reason:
      "This post appears to be promotional spam with irrelevant external links and commercial content",
    report_category: "spam",
    content_type: "post" as const,
    post_id: linkPost.id,
  } satisfies IRedditCommunityContentReport.ICreate;

  const spamReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: spamReportData,
      },
    );
  typia.assert(spamReport);

  // Validate spam report properties
  TestValidator.equals(
    "spam report reason",
    spamReport.report_reason,
    spamReportData.report_reason,
  );
  TestValidator.equals(
    "spam report category",
    spamReport.report_category,
    spamReportData.report_category,
  );
  TestValidator.equals("spam report status", spamReport.status, "submitted");
  TestValidator.equals(
    "spam report post ID",
    spamReport.reported_post?.id,
    linkPost.id,
  );
  TestValidator.equals(
    "spam report reporter",
    spamReport.reporter.id,
    reporterMember.id,
  );

  // Submit third report (misinformation category) and test subsequent duplicate report prevention
  const misinformationReportData = {
    report_reason:
      "This post contains false information that could mislead readers about important facts",
    report_category: "misinformation",
    content_type: "post" as const,
    post_id: duplicateTestPost.id,
  } satisfies IRedditCommunityContentReport.ICreate;

  const misinformationReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: misinformationReportData,
      },
    );
  typia.assert(misinformationReport);

  // Attempt to report the same content again (should fail to prevent duplicates)
  await TestValidator.error(
    "duplicate content report should fail",
    async () => {
      await api.functional.redditCommunity.member.contentReports.create(
        connection,
        {
          body: misinformationReportData,
        },
      );
    },
  );

  // Submit final report with hate speech category
  const hateSpeechReportData = {
    report_reason:
      "This post promotes hatred and discrimination based on protected characteristics",
    report_category: "hate_speech",
    content_type: "post" as const,
    post_id: textPost.id,
  } satisfies IRedditCommunityContentReport.ICreate;

  const hateSpeechReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: hateSpeechReportData,
      },
    );
  typia.assert(hateSpeechReport);

  // Validate all critical report fields
  TestValidator.predicate(
    "report has UUID ID",
    typia.is<string & tags.Format<"uuid">>(hateSpeechReport.id),
  );
  TestValidator.predicate(
    "reported_at is valid ISO date-format",
    typia.is<string & tags.Format<"date-time">>(hateSpeechReport.reported_at),
  );
  TestValidator.equals(
    "final report category",
    hateSpeechReport.report_category,
    "hate_speech",
  );
  TestValidator.equals(
    "final report status",
    hateSpeechReport.status,
    "submitted",
  );
}
