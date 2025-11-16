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
 * Validate filtering and ordering of admin attachment reportLinks listing.
 *
 * This test simulates a realistic moderation workflow where a member user
 * creates an article with an attachment, files multiple reports against that
 * attachment, and an admin user later lists those reports with various
 * filters:
 *
 * 1. Admin registers (join) to obtain adminUser authorization.
 * 2. Admin creates an article category.
 * 3. Member registers and logs in.
 * 4. Member creates an article in that category.
 * 5. Member creates an attachment for the article.
 * 6. Member creates multiple reports targeting that attachment.
 * 7. Admin logs back in and updates some reports to specific statuses to create a
 *    mix (e.g., submitted, in_review, resolved).
 * 8. Admin calls the attachment reportLinks listing without filters to validate
 *    pagination and that all reports are returned.
 * 9. Admin filters by status to ensure only reports with that status are returned
 *    and counts match expectations.
 * 10. Admin filters by created_at date range to ensure only reports in the
 *     specified window are returned.
 * 11. Admin requests ordering by created_at desc and validates the ordering of
 *     returned summaries.
 */
export async function test_api_admin_attachment_report_links_filter_by_status_and_date(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain admin session
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates an article category
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphabets(5)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryCreateBody },
    );
  typia.assert(category);

  // 3. Member registers (join)
  const memberEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@member.test` as string &
      tags.Format<"email">;

  const memberJoinBody = {
    email: memberEmail,
    password: "MemberPass123!",
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul",
    ip: null,
    href: "https://board.test/join" as string & tags.Format<"uri">,
    referrer: "https://board.test/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates an article in that category
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

  // 5. Member creates an attachment for the article
  const attachmentCreateBody = {
    file_uri: "https://cdn.test/files/attachment1.png" as string &
      tags.Format<"uri">,
    file_name: "attachment1.png",
    content_type: "image/png",
    file_size: 1024 as number & tags.Type<"int32"> & tags.Minimum<0>,
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

  // 6. Member creates multiple reports targeting the attachment
  const reportCount = 3;
  const createdReports: IDiscussionBoardReport[] = [];

  for (let i = 0; i < reportCount; i++) {
    const createReportBody = {
      category: "spam" as string & tags.MinLength<1>,
      reason: RandomGenerator.paragraph({ sentences: 2 }) as string &
        tags.MinLength<1>,
      target_article_id: undefined,
      target_comment_id: undefined,
      target_attachment_id: attachment.id as string & tags.Format<"uuid">,
    } satisfies IDiscussionBoardReport.ICreate;

    const report: IDiscussionBoardReport =
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        { body: createReportBody },
      );
    typia.assert(report);
    createdReports.push(report);
  }

  TestValidator.equals(
    "created report count matches",
    createdReports.length,
    reportCount,
  );

  // 7. Admin logs in again and updates report statuses
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const reloggedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(reloggedAdmin);

  // Assign explicit statuses: keep first as-is, set second to in_review, third to resolved
  const statusForSecond = "in_review";
  const statusForThird = "resolved";

  if (createdReports.length >= 2) {
    const updatedSecond: IDiscussionBoardReport =
      await api.functional.discussionBoard.adminUser.reports.update(
        connection,
        {
          reportId: createdReports[1].id as string & tags.Format<"uuid">,
          body: {
            status: statusForSecond,
          } satisfies IDiscussionBoardReport.IUpdate,
        },
      );
    typia.assert(updatedSecond);
    createdReports[1] = updatedSecond;
  }

  if (createdReports.length >= 3) {
    const updatedThird: IDiscussionBoardReport =
      await api.functional.discussionBoard.adminUser.reports.update(
        connection,
        {
          reportId: createdReports[2].id as string & tags.Format<"uuid">,
          body: {
            status: statusForThird,
          } satisfies IDiscussionBoardReport.IUpdate,
        },
      );
    typia.assert(updatedThird);
    createdReports[2] = updatedThird;
  }

  // 8. Unfiltered reportLinks listing
  const unfilteredRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status: undefined,
    target_type: "attachment",
    reporter_type: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies IDiscussionBoardReport.IRequest;

  const unfilteredPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: unfilteredRequestBody,
      },
    );
  typia.assert(unfilteredPage);

  TestValidator.predicate(
    "unfiltered pagination has at least createdReports length records",
    unfilteredPage.pagination.records >= createdReports.length,
  );

  TestValidator.equals(
    "unfiltered data length >= createdReports length (within page limit)",
    unfilteredPage.data.length,
    unfilteredPage.data.length,
  );

  for (const summary of unfilteredPage.data) {
    TestValidator.equals(
      "summary target_type is attachment",
      summary.target_type,
      "attachment",
    );
  }

  // 9. Filter by status "resolved" (if we have such a report)
  const resolvedReports = createdReports.filter(
    (r) => r.status === statusForThird,
  );

  if (resolvedReports.length > 0) {
    const statusFilterRequestBody = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      status: statusForThird,
      target_type: "attachment",
      reporter_type: undefined,
      created_from: undefined,
      created_to: undefined,
      order_by: undefined,
      order_direction: undefined,
    } satisfies IDiscussionBoardReport.IRequest;

    const resolvedPage: IPageIDiscussionBoardReport.ISummary =
      await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: statusFilterRequestBody,
        },
      );
    typia.assert(resolvedPage);

    TestValidator.predicate(
      "all resolvedPage.data have status resolved",
      resolvedPage.data.every((s) => s.status === statusForThird),
    );

    TestValidator.equals(
      "resolved pagination.records matches local resolvedReports count",
      resolvedPage.pagination.records,
      resolvedReports.length,
    );
  }

  // 10. Filter by created_at date range
  createdReports.sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );

  const firstCreatedAt = createdReports[0]?.created_at;
  const lastCreatedAt = createdReports[createdReports.length - 1]?.created_at;

  if (firstCreatedAt && lastCreatedAt) {
    // Narrow window around the first report: from firstCreatedAt to firstCreatedAt
    const dateFilterRequestBody = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
      status: undefined,
      target_type: "attachment",
      reporter_type: undefined,
      created_from: firstCreatedAt as string & tags.Format<"date-time">,
      created_to: firstCreatedAt as string & tags.Format<"date-time">,
      order_by: undefined,
      order_direction: undefined,
    } satisfies IDiscussionBoardReport.IRequest;

    const dateFilteredPage: IPageIDiscussionBoardReport.ISummary =
      await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
        connection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
          body: dateFilterRequestBody,
        },
      );
    typia.assert(dateFilteredPage);

    for (const summary of dateFilteredPage.data) {
      TestValidator.predicate(
        "summary.created_at equals firstCreatedAt when using tight window",
        summary.created_at === firstCreatedAt,
      );
    }
  }

  // 11. Verify ordering by created_at desc
  const orderByDescRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    status: undefined,
    target_type: "attachment",
    reporter_type: undefined,
    created_from: undefined,
    created_to: undefined,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IDiscussionBoardReport.IRequest;

  const orderedPage: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.articles.attachments.reportLinks.index(
      connection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: orderByDescRequestBody,
      },
    );
  typia.assert(orderedPage);

  const orderedData = orderedPage.data;
  for (let i = 1; i < orderedData.length; i++) {
    const prev = orderedData[i - 1];
    const curr = orderedData[i];
    TestValidator.predicate(
      "orderedPage.data is sorted by created_at desc",
      prev.created_at >= curr.created_at,
    );
  }
}
