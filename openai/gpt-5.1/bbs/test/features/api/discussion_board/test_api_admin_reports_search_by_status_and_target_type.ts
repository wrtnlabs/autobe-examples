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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

export async function test_api_admin_reports_search_by_status_and_target_type(
  connection: api.IConnection,
) {
  // 1. Admin join (auto-sets admin token on connection)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Member join (switches token to member user)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://member.example.com/join",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. Switch back to admin to create a category
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 4. Switch to member to create article, comment, attachment, and reports
  const memberLoginBody = {
    email: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://member.example.com/login",
    referrer: "https://member.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const memberLoggedIn: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleBody,
      },
    );
  typia.assert(article);

  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  const attachmentBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: `${RandomGenerator.alphaNumeric(8)}.txt`,
    content_type: "text/plain",
    file_size: 1024,
    order_in_article: 1,
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 5. Create three reports as member: article, comment, attachment
  const reportArticleBody = {
    category: "hate_abuse",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportCommentBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_comment_id: comment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportAttachmentBody = {
    category: "off_topic",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportArticle: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportArticleBody,
    });
  typia.assert(reportArticle);

  const reportComment: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCommentBody,
    });
  typia.assert(reportComment);

  const reportAttachment: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportAttachmentBody,
    });
  typia.assert(reportAttachment);

  // 6. Switch back to admin to search reports
  const adminReLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminReLogin);

  // First, get baseline for article target_type without status filter
  const baselineRequest = {
    page: 1,
    limit: 50,
    status: undefined,
    target_type: "article",
    reporter_type: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IDiscussionBoardReport.IRequest;

  const baselinePage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.reports.index(connection, {
      body: baselineRequest,
    });
  typia.assert(baselinePage);

  // Find the baseline summary for the article report
  const articleSummary = baselinePage.data.find(
    (summary) => summary.id === reportArticle.id,
  );

  await TestValidator.predicate(
    "article report should be present in baseline article-target list",
    async () => articleSummary !== undefined,
  );

  if (!articleSummary) return; // Defensive: nothing more to assert if not found

  const targetStatus: string = articleSummary.status;

  // 7. Execute combined filter query: status + target_type
  const filterLimit = 20;

  const filteredRequest = {
    page: 1,
    limit: filterLimit,
    status: targetStatus,
    target_type: "article",
    reporter_type: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IDiscussionBoardReport.IRequest;

  const filteredPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.reports.index(connection, {
      body: filteredRequest,
    });
  typia.assert(filteredPage);

  const pagination: IPage.IPagination = filteredPage.pagination;
  typia.assert(pagination);

  // 8. Pagination consistency assertions
  TestValidator.equals(
    "pagination.limit should equal requested limit",
    pagination.limit,
    filterLimit,
  );

  await TestValidator.predicate(
    "pagination.current must be non-negative",
    async () => pagination.current >= 0,
  );

  await TestValidator.predicate(
    "pagination.records must be >= data.length",
    async () => pagination.records >= filteredPage.data.length,
  );

  await TestValidator.predicate(
    "pagination.pages must be >= 0",
    async () => pagination.pages >= 0,
  );

  if (pagination.records === 0) {
    await TestValidator.predicate(
      "when records==0, data.length must be 0 and pages must be 0",
      async () => filteredPage.data.length === 0 && pagination.pages === 0,
    );
  } else if (pagination.records <= pagination.limit) {
    await TestValidator.predicate(
      "when records <= limit and records > 0, pages must be 1",
      async () => pagination.pages === 1,
    );
  }

  // 9. Business assertions: all results match status + target_type
  for (const summary of filteredPage.data) {
    TestValidator.equals(
      "summary.status should equal requested status",
      summary.status,
      targetStatus,
    );
    TestValidator.equals(
      "summary.target_type should be 'article'",
      summary.target_type,
      "article",
    );
  }

  // Ensure that the article report appears in filtered data
  const filteredHasArticle = filteredPage.data.some(
    (summary) => summary.id === reportArticle.id,
  );

  await TestValidator.predicate(
    "filtered result must contain the article report",
    async () => filteredHasArticle,
  );

  // Ensure that comment and attachment reports are excluded from article+status filter
  const filteredHasComment = filteredPage.data.some(
    (summary) => summary.id === reportComment.id,
  );
  const filteredHasAttachment = filteredPage.data.some(
    (summary) => summary.id === reportAttachment.id,
  );

  await TestValidator.predicate(
    "filtered result must NOT contain comment-targeting report",
    async () => filteredHasComment === false,
  );

  await TestValidator.predicate(
    "filtered result must NOT contain attachment-targeting report",
    async () => filteredHasAttachment === false,
  );
}
