import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportReasonCategory";
import type { IDiscussionBoardReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatus";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import type { IEDiscussionBoardAppealStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEDiscussionBoardAppealStatus";

export async function test_api_appeal_retrieval_by_member(
  connection: api.IConnection,
) {
  // 1) Member A signs up (join)
  const memberJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 2) Create an article as the authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
    category_slug: null,
    tag_slugs: [],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Add a comment to the article
  const commentBody = {
    content: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 4) Add an attachment to the article
  const attachmentBody = {
    original_filename: "test-file.txt",
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "text/plain",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<20971520>
    >(),
    is_image: false,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 5) Create a report targeting the article
  const reportBody = {
    target_type: "article",
    target_id: article.id,
    reason_category: "Other" as IDiscussionBoardReportReasonCategory,
    explanation: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.member.reports.create(connection, {
      body: reportBody,
    });
  typia.assert(report);

  // 6) Create an appeal referencing the report
  const appealCreateBody = {
    report_id: report.id,
    explanation: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 4,
      wordMax: 10,
    }),
  } satisfies IDiscussionBoardAppeal.ICreate;

  const appeal: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.create(connection, {
      body: appealCreateBody,
    });
  typia.assert(appeal);

  // 7) Retrieve the appeal as the same member (owner) and validate
  const read: IDiscussionBoardAppeal =
    await api.functional.discussionBoard.member.appeals.at(connection, {
      appealId: appeal.id,
    });
  typia.assert(read);

  TestValidator.equals(
    "appellant_member_id should match the creating member",
    read.appellant_member_id,
    member.id,
  );
  TestValidator.predicate(
    "appeal has explanation text",
    read.explanation.length > 0,
  );
  TestValidator.equals(
    "appeal status is a valid enum",
    read.status as IEDiscussionBoardAppealStatus,
    read.status,
  );

  // 8) Negative test: create a different member and attempt to retrieve the appeal
  const otherMemberBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const otherMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: otherMemberBody,
    });
  typia.assert(otherMember);

  // Attempt retrieval as otherMember: should fail (ownership enforcement)
  await TestValidator.error(
    "other member cannot retrieve someone else's appeal",
    async () => {
      await api.functional.discussionBoard.member.appeals.at(connection, {
        appealId: appeal.id,
      });
    },
  );
}
