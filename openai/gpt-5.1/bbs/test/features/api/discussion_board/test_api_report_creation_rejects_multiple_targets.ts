import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that report creation rejects multiple target identifiers.
 *
 * Business rule: exactly one of target_article_id, target_comment_id, or
 * target_attachment_id must be provided when a member user files a report. This
 * test exercises the member-user report creation endpoint in a realistic flow
 * and verifies that attempting to specify multiple targets is treated as an
 * error.
 *
 * Steps:
 *
 * 1. Register a new member user via auth.memberUser.join to obtain an
 *    authenticated connection context (Authorization header is set by SDK).
 * 2. Create a new article through discussionBoard.memberUser.articles.create using
 *    a random but valid IDiscussionBoardArticle.ICreate payload.
 * 3. Create a comment on that article using
 *    discussionBoard.memberUser.articles.comments.create.
 * 4. Attempt to create a report via discussionBoard.memberUser.reports.create with
 *    an IDiscussionBoardReport.ICreate body that sets both target_article_id
 *    and target_comment_id, leaving target_attachment_id undefined.
 * 5. Use TestValidator.error with an async callback to assert that the
 *    multi-target report creation fails (some error is thrown). Do not check
 *    concrete HTTP status codes, only that an error occurs.
 * 6. Ensure that if the API call unexpectedly succeeds and returns an
 *    IDiscussionBoardReport, the test fails explicitly, so any violation of the
 *    mutual exclusivity rule is caught.
 */
export async function test_api_report_creation_rejects_multiple_targets(
  connection: api.IConnection,
) {
  // 1. Register a new member user so that subsequent calls are authenticated.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const member: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2. Create an article as the joined member user.
  const articleCreate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    // Use a random UUID for category; e2e environment is expected to provide
    // a matching category or run in simulate mode.
    categoryId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreate },
    );
  typia.assert(article);

  // 3. Create a comment on the article.
  const commentCreate = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  // 4. Attempt to create a report with multiple targets (article + comment).
  const reportCreate = {
    category: "spam", // any non-empty category string is acceptable
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
    target_comment_id: comment.id,
    // target_attachment_id is intentionally left undefined
  } satisfies IDiscussionBoardReport.ICreate;

  // 5. Assert that creating a multi-target report results in an error.
  await TestValidator.error(
    "multi-target report creation must fail",
    async () => {
      const report: IDiscussionBoardReport =
        await api.functional.discussionBoard.memberUser.reports.create(
          connection,
          { body: reportCreate },
        );
      // If we reach this point, the endpoint has incorrectly accepted the
      // invalid payload; fail the test explicitly.
      typia.assert(report);
      throw new Error(
        "Report creation unexpectedly succeeded with multiple targets",
      );
    },
  );
}
