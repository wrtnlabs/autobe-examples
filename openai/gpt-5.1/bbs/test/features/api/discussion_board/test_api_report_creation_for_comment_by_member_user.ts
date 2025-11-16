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
 * Validate that a member user can report a specific comment on the discussion
 * board and that the report is correctly typed as a comment-targeted report.
 *
 * Business flow covered:
 *
 * 1. Register a new member user and obtain an authenticated session.
 * 2. As that member, create an article in the discussion board.
 * 3. Create a comment attached to the created article.
 * 4. File a report that targets the created comment.
 * 5. Verify that the created report reflects a comment target and that key
 *    moderation fields are populated consistently with the request.
 */
export async function test_api_report_creation_for_comment_by_member_user(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain an authenticated session.
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    location: RandomGenerator.paragraph({ sentences: 2 }),
    ip: "127.0.0.1",
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const member: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IAuthorizationToken>(member.token);
  typia.assert(member);

  // 2. Create an article as this member user.
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 3. Create a comment attached to the created article.
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  TestValidator.equals(
    "comment should point to the created article",
    comment.article.id,
    article.id,
  );

  // 4. File a report targeting the created comment.
  const category: string & tags.MinLength<1> = "harassment";
  const reason: string & tags.MinLength<1> = RandomGenerator.paragraph({
    sentences: 5,
  });

  const reportCreateBody = {
    category,
    reason,
    target_comment_id: comment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 5. Validate key properties on the created report.
  TestValidator.predicate(
    "report target_type should be 'comment'",
    report.target_type === "comment",
  );

  TestValidator.equals(
    "reason_code should match requested category",
    report.reason_code,
    category,
  );

  TestValidator.predicate(
    "report id should be non-empty",
    typeof report.id === "string" && report.id.length > 0,
  );

  TestValidator.predicate(
    "report created_at should be non-empty",
    typeof report.created_at === "string" && report.created_at.length > 0,
  );

  TestValidator.predicate(
    "report updated_at should be non-empty",
    typeof report.updated_at === "string" && report.updated_at.length > 0,
  );

  TestValidator.predicate(
    "reporter_type should be 'memberuser' for member reports",
    report.reporter_type === "memberuser",
  );
}
