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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMemberuser";

/**
 * Validate admin-side member user search pagination and created_at sorting.
 *
 * Business goal: Ensure that PATCH /discussionBoard/adminUser/memberUsers
 * returns a stable, correctly paginated list of member accounts when ordered by
 * created_at in ascending order, and that page boundaries behave correctly.
 *
 * High level steps:
 *
 * 1. Register an admin user and authenticate as adminUser.
 * 2. As adminUser, create a discussion board article category to be used by member
 *    articles.
 * 3. Create at least 25 member users. For each member user, authenticate as that
 *    member and create at least one article assigned to the created category so
 *    that the member is well-formed for the ecosystem.
 * 4. Switch back to adminUser, then call the memberUsers.index endpoint with
 *    page=1, page_size=10, order_by="created_at", order_direction="asc", and
 *    broad filters (no account_statuses filter, email_verified left undefined
 *    so all accounts are included).
 * 5. Call memberUsers.index again for page=2 with identical filters and ordering.
 * 6. Verify via TestValidator that:
 *
 *    - Pagination.records is at least the number of created member users
 *    - Pagination.limit equals the requested page_size
 *    - Pagination.current is within range and reflects 0-based indexing
 *    - Pagination.pages is computed consistently from records and limit
 *    - There is no overlap of ids between page 1 and page 2
 *    - All created_at values within each page are non-decreasing
 *    - Max(created_at) in page 1 is less than or equal to min(created_at) in page 2,
 *         confirming global ordering stability across pages.
 * 7. Optionally, request the last page using pagination.pages - 1 as page in the
 *    request and confirm:
 *
 *    - That data length is <= page_size
 *    - That created_at remains sorted in ascending order
 * 8. Optionally, request an out-of-range page (e.g., very large page index) and
 *    confirm that the service responds gracefully (non-error) with either an
 *    empty data array or a clamped page, without making strict assumptions
 *    about the behavior—only that the response schema is respected.
 */
export async function test_api_admin_member_user_search_sorting_and_pagination_edges(
  connection: api.IConnection,
) {
  // 1. Register an admin user and authenticate
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an article category as admin
  const categoryBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  const createdMemberIds: string[] = [];

  // Helper to build member join body
  const buildMemberJoinBody = () => {
    const email = typia.random<string & tags.Format<"email">>();
    return {
      email,
      password: RandomGenerator.alphaNumeric(10),
      displayName: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      location: RandomGenerator.paragraph({ sentences: 1 }),
      ip: null,
      href: "https://board.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://board.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMemberUserJoin.IRequest;
  };

  const memberCount = 25;

  // 3. Create multiple member users and one article each
  for (let i = 0; i < memberCount; i++) {
    const joinBody = buildMemberJoinBody();

    const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
      await api.functional.auth.memberUser.join(connection, {
        body: joinBody,
      });
    typia.assert(memberAuthorized);

    createdMemberIds.push(memberAuthorized.id);

    // Create an article for this member
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
  }

  // Ensure we are authenticated as admin again
  const adminLoginBody: IDiscussionBoardAdminUserLogin.IRequest = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  };

  const adminLogin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  const pageSize = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;

  // 4. Fetch page 1 (1-based in request)
  const requestPage1: IDiscussionBoardMemberuser.IRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    page_size: pageSize,
    email_verified: null,
    account_statuses: undefined,
    created_from: null,
    created_to: null,
    last_login_from: null,
    last_login_to: null,
    search: undefined,
    order_by: "created_at",
    order_direction: "asc",
  };

  const page1: IPageIDiscussionBoardMemberuser.ISummary =
    await api.functional.discussionBoard.adminUser.memberUsers.index(
      connection,
      { body: requestPage1 },
    );
  typia.assert(page1);

  // 5. Fetch page 2
  const requestPage2: IDiscussionBoardMemberuser.IRequest = {
    ...requestPage1,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  const page2: IPageIDiscussionBoardMemberuser.ISummary =
    await api.functional.discussionBoard.adminUser.memberUsers.index(
      connection,
      { body: requestPage2 },
    );
  typia.assert(page2);

  const pagination1 = page1.pagination;
  const pagination2 = page2.pagination;

  // 6. Assertions on pagination metadata
  TestValidator.predicate(
    "pagination.records should be at least created member count",
    pagination1.records >= createdMemberIds.length,
  );

  TestValidator.equals(
    "pagination.limit should equal requested page_size on page1",
    pagination1.limit,
    pageSize,
  );

  TestValidator.equals(
    "pagination.limit should equal requested page_size on page2",
    pagination2.limit,
    pageSize,
  );

  TestValidator.predicate(
    "pagination.current should be non-negative and within pages on page1",
    pagination1.current >= 0 && pagination1.current < pagination1.pages,
  );

  TestValidator.predicate(
    "pagination.current should be non-negative and within pages on page2",
    pagination2.current >= 0 && pagination2.current < pagination2.pages,
  );

  if (pagination1.limit > 0) {
    const expectedPages = Math.ceil(pagination1.records / pagination1.limit);
    TestValidator.equals(
      "pagination.pages should match records/limit",
      pagination1.pages,
      expectedPages,
    );
  }

  // 6-2. Ensure no overlap between page1 and page2 IDs
  const ids1 = page1.data.map((m) => m.id);
  const ids2 = page2.data.map((m) => m.id);

  const overlap = ids1.filter((id) => ids2.includes(id));
  TestValidator.equals(
    "there should be no overlapping member ids between page1 and page2",
    overlap.length,
    0,
  );

  // Helper: verify non-decreasing created_at within a page
  const assertNonDecreasing = (
    title: string,
    items: IDiscussionBoardMemberuser.ISummary[],
  ) => {
    for (let i = 1; i < items.length; i++) {
      const prev = new Date(items[i - 1].created_at).getTime();
      const curr = new Date(items[i].created_at).getTime();
      TestValidator.predicate(
        `${title} created_at non-decreasing at index ${i}`,
        prev <= curr,
      );
    }
  };

  assertNonDecreasing("page1", page1.data);
  assertNonDecreasing("page2", page2.data);

  // Cross-page ordering: max(created_at in page1) <= min(created_at in page2)
  if (page1.data.length > 0 && page2.data.length > 0) {
    const maxPage1 = page1.data
      .map((m) => new Date(m.created_at).getTime())
      .reduce((a, b) => (a > b ? a : b));
    const minPage2 = page2.data
      .map((m) => new Date(m.created_at).getTime())
      .reduce((a, b) => (a < b ? a : b));

    TestValidator.predicate(
      "max created_at on page1 should be <= min created_at on page2",
      maxPage1 <= minPage2,
    );
  }

  // 7. Optionally test last page boundary if there is more than one page
  if (pagination1.pages > 0) {
    const lastPageIndex = pagination1.pages; // request uses 1-based page
    const lastPageRequest: IDiscussionBoardMemberuser.IRequest = {
      ...requestPage1,
      page: lastPageIndex as number & tags.Type<"int32"> & tags.Minimum<1>,
    };

    const lastPage: IPageIDiscussionBoardMemberuser.ISummary =
      await api.functional.discussionBoard.adminUser.memberUsers.index(
        connection,
        { body: lastPageRequest },
      );
    typia.assert(lastPage);

    const lastData = lastPage.data;
    TestValidator.predicate(
      "last page data length should not exceed page_size",
      lastData.length <= pageSize,
    );

    assertNonDecreasing("last page", lastData);
  }

  // 8. Out-of-range page: request far beyond last page and ensure graceful handling
  const outOfRangeRequest: IDiscussionBoardMemberuser.IRequest = {
    ...requestPage1,
    page: (pagination1.pages + 100) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
  };

  const outOfRange: IPageIDiscussionBoardMemberuser.ISummary =
    await api.functional.discussionBoard.adminUser.memberUsers.index(
      connection,
      { body: outOfRangeRequest },
    );
  typia.assert(outOfRange);

  TestValidator.predicate(
    "out-of-range page should respond gracefully (no error, data length within limit)",
    outOfRange.data.length <= pageSize,
  );
}
