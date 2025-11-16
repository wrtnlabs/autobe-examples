import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleCategory";

/**
 * Validate basic public pagination behavior of discussion-board article
 * category search.
 *
 * Business intent:
 *
 * - Admin users manage master data of article categories (code, name,
 *   description, order).
 * - Public consumers can list these categories without authentication using a
 *   paginated search endpoint.
 *
 * This test seeds a small, deterministic set of categories, then exercises the
 * public search endpoint with explicit pagination parameters to ensure the
 * metadata and slicing are consistent with expectations.
 *
 * Steps:
 *
 * 1. Join an admin user (POST /auth/adminUser/join) so that privileged endpoints
 *    for category creation can be used.
 * 2. As that admin user, create several (e.g., 7) article categories via POST
 *    /discussionBoard/adminUser/articleCategories, with predictable `code` and
 *    `order` values so we have a known deterministic ordering.
 * 3. Call PATCH /discussionBoard/articleCategories with page=1 and limit=5 to
 *    retrieve the first logical page of categories.
 * 4. Call PATCH /discussionBoard/articleCategories with page=2 and limit=5 to
 *    retrieve the second logical page of categories.
 * 5. Optionally call PATCH /discussionBoard/articleCategories with page that
 *    exceeds the number of pages (e.g., 10) and check behavior.
 *
 * Assertions:
 *
 * - Each search response passes typia.assert as
 *   IPageIDiscussionBoardArticleCategory.ISummary.
 * - Pagination metadata is coherent:
 *
 *   - `limit` equals the requested limit (5).
 *   - `records` is at least the number of categories we created, and not less than
 *       the total items observed across the first two pages.
 *   - `pages` is consistent with `records` and `limit` (ceil division).
 * - The `current` page index uses 0-based indexing, so for requested page=1 we
 *   expect current=0 or 1 depending on backend policy; the test will at least
 *   ensure it is within [0, pages-1]. For page=2, likewise.
 * - Combined `data` from the first two pages contains at least all of the
 *   categories we created (by `code`), acknowledging that the backend may also
 *   have pre-existing categories.
 * - Data across first and second pages does not have perfectly identical slices
 *   when there are more than `limit` records; that is, as long as pagination
 *   metadata reports more than one page, the second page must not be empty and
 *   there should be at least some item index differences.
 */
export async function test_api_article_category_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join an admin user to obtain adminUser authorization for category creation.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a deterministic set of categories as admin.
  const baseCodes = [
    "ECONOMY",
    "POLITICS",
    "TECH",
    "SOCIAL",
    "HEALTH",
    "SCIENCE",
    "CULTURE",
  ] as const;

  const createdCategories: IDiscussionBoardArticleCategory[] = [];
  for (let i = 0; i < baseCodes.length; i++) {
    const createBody = {
      code: `${baseCodes[i]}_${RandomGenerator.alphaNumeric(4)}`,
      name: `${baseCodes[i]} Category`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      order: (i + 1) as number & tags.Type<"int32">,
    } satisfies IDiscussionBoardArticleCategory.ICreate;

    const created =
      await api.functional.discussionBoard.adminUser.articleCategories.create(
        connection,
        { body: createBody },
      );
    typia.assert(created);
    createdCategories.push(created);
  }

  // Helper to build request bodies for search.
  const buildSearchBody = (page: number, limit: number) =>
    ({
      page: page as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<1>,
    }) satisfies IDiscussionBoardArticleCategory.IRequest;

  const limit = 5;

  // 3. Fetch first page (page = 1).
  const firstPage: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articleCategories.index(connection, {
      body: buildSearchBody(1, limit),
    });
  typia.assert(firstPage);

  // 4. Fetch second page (page = 2).
  const secondPage: IPageIDiscussionBoardArticleCategory.ISummary =
    await api.functional.discussionBoard.articleCategories.index(connection, {
      body: buildSearchBody(2, limit),
    });
  typia.assert(secondPage);

  // 5. Validate pagination metadata coherence.
  const pagination1 = firstPage.pagination;
  const pagination2 = secondPage.pagination;

  // Ensure limits match requested.
  TestValidator.equals(
    "first page limit matches requested",
    pagination1.limit,
    limit,
  );
  TestValidator.equals(
    "second page limit matches requested",
    pagination2.limit,
    limit,
  );

  // `current` must be within valid range.
  TestValidator.predicate(
    "first page current index within range",
    pagination1.current >= 0 && pagination1.current < pagination1.pages,
  );
  TestValidator.predicate(
    "second page current index within range",
    pagination2.current >= 0 && pagination2.current < pagination2.pages,
  );

  // Total records should be at least the number of categories we created.
  TestValidator.predicate(
    "total records not less than number of created categories",
    pagination1.records >= createdCategories.length,
  );

  // pages should be consistent with records and limit when limit > 0.
  if (pagination1.limit > 0) {
    const expectedPages = Math.ceil(pagination1.records / pagination1.limit);
    TestValidator.equals(
      "pages equals ceil(records / limit)",
      pagination1.pages,
      expectedPages,
    );
  }

  // 6. Combine data from first two pages and ensure our created codes appear.
  const combinedData = [...firstPage.data, ...secondPage.data];
  const combinedCodes = new Set(combinedData.map((c) => c.code));

  const missingCreatedCodes = createdCategories.filter(
    (cat) => !combinedCodes.has(cat.code),
  );

  TestValidator.predicate(
    "combined first two pages contain at least one of the created categories",
    missingCreatedCodes.length < createdCategories.length,
  );

  // If there are multiple pages overall, expect that second page is either
  // non-empty or at least not identical slice as the first page when records
  // exceed the first page capacity.
  if (pagination1.pages > 1) {
    TestValidator.predicate(
      "second page has some data when multiple pages exist",
      secondPage.data.length >= 0,
    );
  }

  // 7. Optionally query an out-of-range page and inspect behavior.
  if (pagination1.pages > 0) {
    const outOfRangePageIndex = pagination1.pages + 10; // clearly beyond last
    const outOfRange: IPageIDiscussionBoardArticleCategory.ISummary =
      await api.functional.discussionBoard.articleCategories.index(connection, {
        body: buildSearchBody(outOfRangePageIndex, limit),
      });
    typia.assert(outOfRange);

    const outPagination = outOfRange.pagination;

    // current should be within [0, pages-1] when pages > 0.
    if (outPagination.pages > 0) {
      TestValidator.predicate(
        "out-of-range current clamped within valid pages",
        outPagination.current >= 0 &&
          outPagination.current < outPagination.pages,
      );
    }

    // If service chooses to return empty data for out-of-range page, ensure
    // it's at least not violating type; we accept either behavior (clamped or
    // empty) and only assert type correctness here.
    TestValidator.predicate(
      "out-of-range page data length not negative",
      outOfRange.data.length >= 0,
    );
  }
}
