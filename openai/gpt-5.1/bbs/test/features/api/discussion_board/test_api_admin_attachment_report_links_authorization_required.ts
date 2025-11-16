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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Validate authorization and read-only behavior for admin attachment
 * reportLinks listing.
 *
 * Business purpose: This test ensures that the admin-only endpoint PATCH
 * /discussionBoard/adminUser/articles/{articleId}/attachments/{attachmentId}/reportLinks
 * correctly enforces authentication/authorization boundaries and behaves as a
 * read-only listing API over reports linked to a specific attachment.
 *
 * High-level steps:
 *
 * 1. Create an admin user and, as that admin, register an article category.
 * 2. Create a member user; as that member, create an article in the category,
 *    attach a file to it, and file at least one report targeting the
 *    attachment.
 * 3. Verify that an unauthenticated client cannot call the admin reportLinks
 *    endpoint.
 * 4. Verify that a member-authenticated client also cannot call the admin
 *    reportLinks endpoint.
 * 5. Re-authenticate as admin and call the reportLinks endpoint successfully,
 *    confirming that the returned page contains the expected report summaries
 *    and that repeated calls are stable and side-effect-free.
 */
export async function test_api_admin_attachment_report_links_authorization_required(
  connection: api.IConnection,
) {
  // -------------------------------------------------------------------------
  // 1. ADMIN SETUP: join as admin and create a category
  // -------------------------------------------------------------------------
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPassword!123" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  const categoryBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // -------------------------------------------------------------------------
  // 2. MEMBER SETUP: join as member and create article, attachment, reports
  // -------------------------------------------------------------------------
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPassword!123",
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: RandomGenerator.paragraph({ sentences: 1 }),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

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

  const attachmentBody = {
    file_uri: typia.random<string & tags.Format<"uri">>(),
    file_name: RandomGenerator.paragraph({ sentences: 1 }),
    content_type: RandomGenerator.pick([
      "image/png",
      "image/jpeg",
      "application/pdf",
    ] as const),
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000000>
    >(),
    order_in_article: typia.random<number & tags.Type<"int32">>(),
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

  const reportBodies: IDiscussionBoardReport.ICreate[] = ArrayUtil.repeat(
    2,
    (index) =>
      ({
        category: index === 0 ? "spam" : "off_topic",
        reason: RandomGenerator.paragraph({ sentences: 4 }),
        target_article_id: undefined,
        target_comment_id: undefined,
        target_attachment_id: attachment.id,
      }) satisfies IDiscussionBoardReport.ICreate,
  );

  const createdReportIds: string[] = [];
  for (const body of reportBodies) {
    const report: IDiscussionBoardReport =
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        {
          body,
        },
      );
    typia.assert(report);
    createdReportIds.push(report.id);
  }

  // -------------------------------------------------------------------------
  // 3. UNAUTHENTICATED ACCESS: expect error when no Authorization header
  // -------------------------------------------------------------------------
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated client cannot list attachment report links",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
        unauthConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: {
            page: 1,
            limit: 10,
            target_type: "attachment",
            reporter_type: "memberuser",
          } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    },
  );

  // -------------------------------------------------------------------------
  // 4. MEMBER-AUTHENTICATED ACCESS: expect error for member caller
  // -------------------------------------------------------------------------
  const memberConnection: api.IConnection = { ...connection };

  await TestValidator.error(
    "member user cannot list attachment report links via admin endpoint",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
        memberConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: {
            page: 1,
            limit: 10,
            target_type: "attachment",
            reporter_type: "memberuser",
          } satisfies IDiscussionBoardReport.IRequest,
        },
      );
    },
  );

  // -------------------------------------------------------------------------
  // 5. ADMIN-AUTHORIZED ACCESS: login as admin and list reports
  // -------------------------------------------------------------------------
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPassword!123",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoginResult: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  const firstRequestBody = {
    page: 1,
    limit: 10,
    status: undefined,
    target_type: "attachment",
    reporter_type: "memberuser",
    created_from: undefined,
    created_to: undefined,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IDiscussionBoardReport.IRequest;

  const firstPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: firstRequestBody,
      },
    );
  typia.assert(firstPage);

  TestValidator.predicate(
    "attachment reportLinks listing should contain at least one report",
    firstPage.pagination.records >= 1,
  );

  TestValidator.predicate(
    "listed reports all target attachment type",
    firstPage.data.every((summary) => summary.target_type === "attachment"),
  );

  TestValidator.predicate(
    "listed reports all come from memberuser reporter type",
    firstPage.data.every((summary) => summary.reporter_type === "memberuser"),
  );

  const firstIds: string[] = firstPage.data.map((summary) => summary.id);

  // -------------------------------------------------------------------------
  // 6. READ-ONLY CHECK: repeated call returns consistent data
  // -------------------------------------------------------------------------
  const secondPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: firstRequestBody,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "pagination records remain stable between repeated listings",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );

  TestValidator.equals(
    "pagination pages remain stable between repeated listings",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );

  const secondIds: string[] = secondPage.data.map((summary) => summary.id);

  const sortedFirstIds = [...firstIds].sort();
  const sortedSecondIds = [...secondIds].sort();

  TestValidator.equals(
    "report ID set remains stable across repeated listings",
    sortedFirstIds,
    sortedSecondIds,
  );

  const firstStatusMap = new Map<string, { status: string; action: string }>();
  for (const summary of firstPage.data) {
    firstStatusMap.set(summary.id, {
      status: summary.status,
      action: summary.action,
    });
  }

  for (const summary of secondPage.data) {
    const initial = firstStatusMap.get(summary.id);
    if (!initial) continue;

    TestValidator.equals(
      "report status remains unchanged across repeated listings",
      summary.status,
      initial.status,
    );

    TestValidator.equals(
      "report action remains unchanged across repeated listings",
      summary.action,
      initial.action,
    );
  }
}
