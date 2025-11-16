import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate admin hard deletion of a discussion board report while keeping
 * underlying content intact.
 *
 * Business scenario:
 *
 * - A member participates in the discussion board by creating an article, adding
 *   a comment, and uploading an attachment.
 * - The same member then files a report against the article.
 * - An admin reviews the report (implicitly) and performs a hard delete of that
 *   report as a cleanup action.
 * - After deletion, the report must no longer be retrievable via the admin report
 *   detail API, while the article, comment, and attachment are unaffected.
 *
 * Steps implemented:
 *
 * 1. Register an admin user (join) and obtain admin authorization.
 * 2. As admin, create an article category used by member articles.
 * 3. Register a member user and obtain member authorization.
 * 4. As member, create an article under the created category.
 * 5. As member, create a comment for the article.
 * 6. As member, create an attachment for the article.
 * 7. As member, create a report targeting the article.
 * 8. Switch back to the admin actor (login).
 * 9. As admin, confirm the report can be fetched by id.
 * 10. As admin, delete the report via the admin erase endpoint.
 * 11. Assert that a subsequent admin GET by the same reportId results in an error
 *     (not-found/forbidden), proving the deletion took effect.
 *
 * Underlying article/comment/attachment existence after deletion cannot be
 * re-verified with the currently exposed SDK operations, so the test focuses on
 * the observable behavior of the report resource itself and on the fact that
 * delete does not cause any immediate failures when operating on the rest of
 * the workflow.
 */
export async function test_api_admin_report_hard_delete_after_resolution(
  connection: api.IConnection,
) {
  // 1) Admin join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorizedOnJoin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedOnJoin);

  // 2) Admin creates an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category.id should be a non-empty uuid-like string",
    category.id.length > 0,
  );

  // 3) Member join
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const memberJoinBody = {
    email: memberEmail,
    password: memberPassword,
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorizedOnJoin: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedOnJoin);

  // 4) Member creates an article under the category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleCreateBody },
    );
  typia.assert(article);
  TestValidator.equals(
    "article.category.id should match category.id",
    article.category.id,
    category.id,
  );

  // 5) Member adds a comment to the article
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id as string & tags.Format<"uuid">,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals(
    "comment.article.id should match article.id",
    comment.article.id,
    article.id,
  );

  // 6) Member adds an attachment to the article
  const attachmentCreateBody = {
    file_uri: typia.random<string & tags.Format<"uri">>(),
    file_name: RandomGenerator.name(1),
    content_type: "image/png",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: 1 as number & tags.Type<"int32">,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id as string & tags.Format<"uuid">,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "attachment.discussion_board_article_id should match article.id",
    attachment.discussion_board_article_id,
    article.id,
  );

  // 7) Member files a report targeting the article
  const reportCreateBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const report: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);
  TestValidator.equals(
    "report.target_type should indicate article-level report (string non-empty)",
    report.target_type.length > 0,
    true,
  );

  // 8) Switch back to admin actor via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminAuthorizedOnLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedOnLogin);

  // 9) Admin fetches the report by id to confirm it exists
  const fetched: IDiscussionBoardReport =
    await api.functional.discussionBoard.adminUser.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(fetched);
  TestValidator.equals(
    "fetched report id should equal created report id",
    fetched.id,
    report.id,
  );

  // 10) Admin deletes the report
  await api.functional.discussionBoard.adminUser.reports.erase(connection, {
    reportId: report.id as string & tags.Format<"uuid">,
  });

  // 11) Subsequent GET should fail (report not found or forbidden)
  await TestValidator.error(
    "admin GET report by id should fail after erase",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.at(connection, {
        reportId: report.id,
      });
    },
  );
}
