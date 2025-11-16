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
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validate that an admin can retrieve detail of a report targeting an
 * attachment.
 *
 * Business flow:
 *
 * 1. Create an adminUser account via auth.adminUser.join.
 * 2. Create a discussion-board article category as adminUser.
 * 3. Create a memberUser account via auth.memberUser.join.
 * 4. As memberUser, create an article under the created category.
 * 5. As memberUser, create an attachment under that article.
 * 6. As memberUser, create a report whose target_attachment_id is the created
 *    attachment.
 * 7. As adminUser, call the admin report detail endpoint with that report id.
 * 8. Assert that the returned report matches the created one and has target_type
 *    "attachment" and core moderation fields populated.
 */
export async function test_api_admin_report_detail_for_attachment_target(
  connection: api.IConnection,
) {
  // 1. Create adminUser via join (also authenticates as adminUser)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create article category as adminUser
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // 3. Create memberUser via join (also authenticates as memberUser)
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: "127.0.0.1",
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      { body: articleBody },
    );
  typia.assert(article);

  // 5. As memberUser, create an attachment under the article
  const attachmentBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: `file_${RandomGenerator.alphaNumeric(8)}.png`,
    content_type: "image/png",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: 1 as number & tags.Type<"int32">,
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

  // 6. As memberUser, create a report targeting the attachment
  const reportCreateBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);

  TestValidator.equals(
    "created report target_type should be attachment",
    createdReport.target_type,
    "attachment",
  );

  // 7. Switch back to adminUser: login using admin email/password
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 8. As adminUser, fetch report detail by id
  const fetchedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.adminUser.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(fetchedReport);

  // Validate that ids match
  TestValidator.equals(
    "admin fetched report id matches created report id",
    fetchedReport.id,
    createdReport.id,
  );

  // target_type should be attachment
  TestValidator.equals(
    "admin fetched report target_type should be attachment",
    fetchedReport.target_type,
    "attachment",
  );

  // reason_code and description should reflect creation payload mapping
  TestValidator.equals(
    "reason_code equals creation category",
    fetchedReport.reason_code,
    reportCreateBody.category,
  );

  TestValidator.equals(
    "description equals creation reason",
    fetchedReport.description,
    reportCreateBody.reason,
  );

  // core moderation fields should be non-empty strings
  TestValidator.predicate(
    "status should be non-empty string",
    fetchedReport.status.length > 0,
  );

  TestValidator.predicate(
    "action should be non-empty string",
    fetchedReport.action.length > 0,
  );

  TestValidator.predicate(
    "created_at should be non-empty",
    fetchedReport.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be non-empty",
    fetchedReport.updated_at.length > 0,
  );
}
