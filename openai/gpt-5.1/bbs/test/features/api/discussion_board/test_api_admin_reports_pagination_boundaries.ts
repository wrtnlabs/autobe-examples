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
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Validate admin report search pagination boundaries and consistency.
 *
 * Business context: Admin users review discussion board reports through a
 * paginated listing API (PATCH /discussionBoard/adminUser/reports). This test
 * ensures that when there are more reports than a single page can hold,
 * pagination metadata in IPage.IPagination and the data slice of
 * IDiscussionBoardReport.ISummary behave consistently for first, middle, and
 * beyond-last page requests.
 *
 * Steps:
 *
 * 1. Register an adminUser (join) so we can create article categories and later
 *    call the admin reports index endpoint.
 * 2. Register a memberUser (join) who will create an article and file reports.
 * 3. As adminUser, create an article category via
 *    /discussionBoard/adminUser/articleCategories.
 * 4. Switch to memberUser, create a single article in that category.
 * 5. Still as memberUser, create N reports (N > pageLimit * 2, e.g. 13–15) all
 *    targeting the same article via /discussionBoard/memberUser/reports.
 * 6. Switch back to adminUser and query /discussionBoard/adminUser/reports with a
 *    small limit (e.g. 5) and different page values:
 *
 *    - First page: page=1
 *    - Middle page: page=2
 *    - Out-of-range page: page set to a very large number (e.g. 9999)
 * 7. For each response, assert that:
 *
 *    - Pagination.records equals the total records matching the query (we know it
 *         must be >= number of created reports, but due to pre-existing data in
 *         shared test DB we only assert lower bounds and consistency
 *         relationships rather than exact equality).
 *    - Pagination.pages == 0 iff records == 0.
 *    - If records > 0 then pages >= 1 and 0 <= current < pages.
 *    - Data.length <= pagination.limit.
 *    - If pages == 0, then data.length == 0.
 *    - For the first page call, current == 0 and data.length > 0 when records > 0.
 *    - For the middle page call, when pages >= 2, current == 1 and data.length <=
 *         limit.
 *    - For the out-of-range page call, either:
 *
 *         - Current is clamped to pages-1 (and data.length > 0), or
 *         - Pages == 0 && records == 0 && data.length == 0, or
 *         - Pages > 0 with current within range and data.length <= limit but potentially
 *                   empty if implementation chooses that semantics.
 *
 * Implementation notes:
 *
 * - Use RandomGenerator and typia.random to generate realistic test data,
 *   respecting DTO constraints (email format, URI formats, etc.).
 * - Use IDiscussionBoardAdminUserJoin.IRequest and
 *   IDiscussionBoardAdminUserLogin.IRequest for admin auth, and corresponding
 *   memberUser DTOs for member auth.
 * - Use IDiscussionBoardArticleCategory.ICreate and
 *   IDiscussionBoardArticle.ICreate for category/article creation.
 * - Use IDiscussionBoardReport.ICreate with target_article_id set to the created
 *   article ID when creating reports.
 * - Use IDiscussionBoardReport.IRequest for the admin reports index body, setting
 *   page and limit and a reporter_type filter of "memberuser" and target_type
 *   "article" to focus on the reports we just created.
 * - Always validate response types with typia.assert and use TestValidator for
 *   business-rule assertions.
 */
export async function test_api_admin_reports_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register an adminUser via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Extract admin email for later login (though join already authenticates)
  const adminEmail: string & tags.Format<"email"> = adminAuthorized.email;

  // 2. Register a memberUser via join
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    location: "Seoul, Korea",
    ip: null,
    href: "https://board.example.com/join",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberEmail: string & tags.Format<"email"> = memberAuthorized.email;

  // 3. As adminUser, create an article category
  // (join has already set admin token on connection)
  const categoryCreateBody = {
    code: `CAT-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
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

  // 4. Switch to memberUser and create an article in that category
  const memberLoginBody = {
    email: memberEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://board.example.com/login",
    referrer: "https://board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserLogin.IRequest;

  const reloggedMember: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(reloggedMember);

  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 5. As memberUser, create multiple reports targeting this article
  const pageLimit = 5 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const reportCount = pageLimit * 3; // ensure multiple pages worth of reports

  await ArrayUtil.asyncRepeat(reportCount, async (index) => {
    const reportBody = {
      category: RandomGenerator.pick([
        "hate_abuse",
        "harassment",
        "spam",
        "off_topic",
        "dangerous_misleading",
        "other",
      ] as const),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      target_article_id: article.id,
      target_comment_id: undefined,
      target_attachment_id: undefined,
    } satisfies IDiscussionBoardReport.ICreate;

    const report: IDiscussionBoardReport =
      await api.functional.discussionBoard.memberUser.reports.create(
        connection,
        {
          body: reportBody,
        },
      );
    typia.assert(report);
  });

  // Helper to validate pagination consistency
  const assertPaginationConsistency = (
    title: string,
    page: IPage.IPagination,
    dataLength: number,
  ): void => {
    const { current, limit, records, pages } = page;

    TestValidator.predicate(
      `${title} - limit is non-negative`,
      () => limit >= 0,
    );
    TestValidator.predicate(
      `${title} - records is non-negative`,
      () => records >= 0,
    );
    TestValidator.predicate(
      `${title} - pages is non-negative`,
      () => pages >= 0,
    );

    // pages == 0 iff records == 0
    if (records === 0) {
      TestValidator.equals(
        `${title} - pages is zero when records zero`,
        pages,
        0,
      );
      TestValidator.equals(
        `${title} - data length is zero when no records`,
        dataLength,
        0,
      );
      TestValidator.equals(
        `${title} - current is zero when no records`,
        current,
        0,
      );
    } else {
      TestValidator.predicate(
        `${title} - pages positive when records > 0`,
        () => pages >= 1,
      );
      TestValidator.predicate(
        `${title} - current within [0, pages) when records > 0`,
        () => current >= 0 && current < pages,
      );
      TestValidator.predicate(
        `${title} - data length not exceeding limit`,
        () => dataLength <= limit,
      );
    }
  };

  // 6. Switch to adminUser to query reports
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const reloggedAdmin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(reloggedAdmin);

  // Base filter to focus on memberuser reports on articles
  const baseRequestFilter = {
    reporter_type: "memberuser",
    target_type: "article",
  } satisfies Partial<
    Pick<IDiscussionBoardReport.IRequest, "reporter_type" | "target_type">
  >;

  const makeRequestBody = (
    page: number & tags.Type<"int32"> & tags.Minimum<1>,
  ): IDiscussionBoardReport.IRequest => {
    return {
      ...baseRequestFilter,
      page,
      limit: pageLimit,
    } satisfies IDiscussionBoardReport.IRequest;
  };

  // 7-a. First page
  const firstPageBody = makeRequestBody(
    1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  );
  const firstPageResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.reports.index(connection, {
      body: firstPageBody,
    });
  typia.assert(firstPageResult);

  const firstPagination = firstPageResult.pagination;
  const firstData = firstPageResult.data;

  assertPaginationConsistency("first page", firstPagination, firstData.length);

  if (firstPagination.records > 0) {
    TestValidator.equals(
      "first page - current is 0 when there are records",
      firstPagination.current,
      0,
    );
    TestValidator.predicate(
      "first page - data length > 0 when there are records",
      () => firstData.length > 0,
    );
  }

  // 7-b. Middle page (page=2) – only meaningful if we have at least two pages
  const middlePageBody = makeRequestBody(
    2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  );
  const middlePageResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.reports.index(connection, {
      body: middlePageBody,
    });
  typia.assert(middlePageResult);

  const middlePagination = middlePageResult.pagination;
  const middleData = middlePageResult.data;

  assertPaginationConsistency(
    "middle page",
    middlePagination,
    middleData.length,
  );

  if (middlePagination.records > 0 && middlePagination.pages >= 2) {
    TestValidator.equals(
      "middle page - current is 1 for second page when pages >= 2",
      middlePagination.current,
      1,
    );
    TestValidator.predicate(
      "middle page - data length <= limit",
      () => middleData.length <= middlePagination.limit,
    );
  }

  // Capture total records/pages to design out-of-range request
  const totalRecords = firstPagination.records;
  const totalPages = firstPagination.pages;

  // 7-c. Out-of-range page (way beyond last page)
  const hugePageNumber = 9999 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const outOfRangeBody = makeRequestBody(hugePageNumber);
  const outOfRangeResult: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.adminUser.reports.index(connection, {
      body: outOfRangeBody,
    });
  typia.assert(outOfRangeResult);

  const outPagination = outOfRangeResult.pagination;
  const outData = outOfRangeResult.data;

  assertPaginationConsistency(
    "out-of-range page",
    outPagination,
    outData.length,
  );

  if (totalRecords === 0) {
    TestValidator.equals(
      "out-of-range - when no records, pages must be 0",
      outPagination.pages,
      0,
    );
    TestValidator.equals(
      "out-of-range - when no records, current must be 0",
      outPagination.current,
      0,
    );
    TestValidator.equals(
      "out-of-range - when no records, data length must be 0",
      outData.length,
      0,
    );
  } else {
    // When there are records, we allow two main strategies:
    // - clamp: current == pages-1 (last page) and data.length > 0
    // - any other in-range current with data.length <= limit (may be 0)
    TestValidator.predicate(
      "out-of-range - current within [0, pages) when records > 0",
      () =>
        outPagination.pages >= 1 &&
        outPagination.current >= 0 &&
        outPagination.current < outPagination.pages,
    );

    if (outPagination.pages >= 1) {
      // If clamped to last page, we expect some data
      if (outPagination.current === outPagination.pages - 1) {
        TestValidator.predicate(
          "out-of-range - clamped last page has data",
          () => outData.length > 0,
        );
      } else {
        // Otherwise just ensure data length within limit (could be 0)
        TestValidator.predicate(
          "out-of-range - non-last page respects limit",
          () => outData.length <= outPagination.limit,
        );
      }
    }
  }
}
