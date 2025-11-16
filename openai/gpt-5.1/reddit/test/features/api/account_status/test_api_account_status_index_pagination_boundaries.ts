import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAccountStatus";

/**
 * Validate pagination boundary behavior for platform admin account status
 * index.
 *
 * Business context: Platform administrators manage a catalog of account
 * statuses stored in `community_platform_account_statuses`. The index endpoint
 * exposes this catalog with rich filtering and pagination semantics via a PATCH
 * request body. Admin consoles will rely on this endpoint to render paginated
 * lists and must be able to handle boundary cases such as the first page,
 * middle pages, and out-of-range page requests without server errors.
 *
 * This test verifies that:
 *
 * - Pagination metadata (current, limit, records, pages) is self-consistent.
 * - Page 1 and 2 return the expected page size slice when enough records exist.
 * - Requests for pages beyond the last page are handled gracefully (no server
 *   error), and either return an empty data array with consistent pagination
 *   metadata or clamp the current page to the last available page while still
 *   returning a valid slice.
 *
 * High-level steps:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join to
 *    establish an authenticated admin session.
 * 2. As that admin, create more account statuses than a small test page size using
 *    POST /communityPlatform/platformAdmin/accountStatuses. For example, create
 *    5 statuses while testing with limit = 2 so that we expect 3 pages of
 *    results.
 * 3. Call PATCH /communityPlatform/platformAdmin/accountStatuses with
 *    ICommunityPlatformAccountStatus.IRequest { page: 1, limit: 2 } and
 *    validate:
 *
 *    - Pagination.current is 1 (or at least non-negative and logically consistent
 *         with requested page semantics).
 *    - Pagination.limit is 2.
 *    - Data.length is at most 2 and greater than 0 when records exist.
 *    - Pagination.records is at least the number of statuses we just created.
 *    - Pagination.pages equals Math.ceil(records / limit).
 * 4. Call the index again with page = 2 and the same limit. Assert that:
 *
 *    - Pagination.current reflects a second page (either 2 when clamped or remains
 *         consistent with API semantics).
 *    - Data.length is at most 2 and contributes to the total slice of results.
 *    - There is no overlap in IDs between page 1 and page 2 slices when limits and
 *         record counts allow.
 * 5. Call the index with page set beyond the last page, such as page = 10 while
 *    total pages are expected to be 3. Assert that:
 *
 *    - The server does not throw an error.
 *    - Either data is empty and pagination.current reflects the out-of-range
 *         request, or pagination.current is clamped to the last page and data
 *         corresponds to that last page.
 *    - Pagination.pages remains consistent with records and limit.
 * 6. Throughout, rely on typia.assert for structural and type validation of
 *    responses, and TestValidator for business-level assertions such as page
 *    size, slice uniqueness, and metadata relations.
 */
export async function test_api_account_status_index_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator to obtain authenticated admin session
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized = await api.functional.auth.platformAdmin.join(
    connection,
    { body: joinBody },
  );
  typia.assert(adminAuthorized);

  // 2. Create multiple account statuses (more than small page size)
  const PAGE_LIMIT = 2;
  const STATUS_COUNT = 5;

  const createdStatuses: ICommunityPlatformAccountStatus[] =
    await ArrayUtil.asyncRepeat(STATUS_COUNT, async (index) => {
      const createBody = {
        key: `TEST_STATUS_${index}_${RandomGenerator.alphabets(6)}`,
        label: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        isLoginAllowed: index % 2 === 0,
        isPostingAllowed: index % 3 !== 0,
        isVotingAllowed: index % 2 !== 1,
        requiresManualReview: index % 2 === 0,
      } satisfies ICommunityPlatformAccountStatus.ICreate;

      const created =
        await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
          connection,
          { body: createBody },
        );
      typia.assert(created);
      return created;
    });

  // Helper to call index with given page/limit
  const fetchPage = async (
    page: number,
    limit: number,
  ): Promise<IPageICommunityPlatformAccountStatus.ISummary> => {
    const body = {
      page,
      limit,
    } satisfies ICommunityPlatformAccountStatus.IRequest;

    const output =
      await api.functional.communityPlatform.platformAdmin.accountStatuses.index(
        connection,
        { body },
      );
    typia.assert(output);
    return output;
  };

  // 3. Fetch first page
  const page1 = await fetchPage(1, PAGE_LIMIT);
  const pagination1 = page1.pagination;

  TestValidator.predicate(
    "page 1: current page index should be non-negative",
    pagination1.current >= 0,
  );
  TestValidator.equals(
    "page 1: limit should match requested limit",
    pagination1.limit,
    PAGE_LIMIT,
  );
  TestValidator.predicate(
    "page 1: records should be at least number of created statuses",
    pagination1.records >= createdStatuses.length,
  );
  TestValidator.equals(
    "page 1: pages equals ceil(records / limit) when limit > 0",
    pagination1.pages,
    pagination1.limit > 0
      ? Math.ceil(pagination1.records / pagination1.limit)
      : 0,
  );
  TestValidator.predicate(
    "page 1: data length should be > 0 when records > 0 and <= limit",
    pagination1.records === 0
      ? page1.data.length === 0
      : page1.data.length > 0 && page1.data.length <= pagination1.limit,
  );

  const page1Ids = page1.data.map((s) => s.id);

  // 4. Fetch second page and validate slice behavior
  const page2 = await fetchPage(2, PAGE_LIMIT);
  const pagination2 = page2.pagination;

  TestValidator.predicate(
    "page 2: current page index should be non-negative",
    pagination2.current >= 0,
  );
  TestValidator.equals(
    "page 2: limit should match requested limit",
    pagination2.limit,
    PAGE_LIMIT,
  );
  TestValidator.equals(
    "page 2: records should be consistent with page 1",
    pagination2.records,
    pagination1.records,
  );
  TestValidator.equals(
    "page 2: total pages should be consistent with page 1",
    pagination2.pages,
    pagination1.pages,
  );
  TestValidator.predicate(
    "page 2: data length should be <= limit",
    page2.data.length <= pagination2.limit,
  );

  const page2Ids = page2.data.map((s) => s.id);
  const overlapIds = page2Ids.filter((id) => page1Ids.includes(id));
  TestValidator.predicate(
    "page 1 and page 2 should not overlap when multiple pages are available",
    pagination1.pages > 1 ? overlapIds.length === 0 : true,
  );

  // 5. Fetch a page beyond the last page (e.g., page 10) and validate
  const requestedOutOfRangePage = 10;
  const pageOut = await fetchPage(requestedOutOfRangePage, PAGE_LIMIT);
  const paginationOut = pageOut.pagination;

  TestValidator.equals(
    "out-of-range: records count should remain consistent",
    paginationOut.records,
    pagination1.records,
  );
  TestValidator.equals(
    "out-of-range: pages count should remain consistent",
    paginationOut.pages,
    pagination1.pages,
  );
  TestValidator.equals(
    "out-of-range: limit should remain consistent",
    paginationOut.limit,
    PAGE_LIMIT,
  );

  // Behavior may be either: empty data with requested current, or clamped
  // to last page with non-empty data. We just need to ensure no error and
  // that metadata is self-consistent.
  TestValidator.predicate(
    "out-of-range: current page index should be non-negative",
    paginationOut.current >= 0,
  );
  TestValidator.predicate(
    "out-of-range: data length should not exceed limit",
    pageOut.data.length <= paginationOut.limit,
  );

  if (paginationOut.pages === 0) {
    // No records case: expect empty data regardless of requested page
    TestValidator.equals(
      "out-of-range: when pages=0, data must be empty",
      pageOut.data.length,
      0,
    );
  } else if (paginationOut.current >= paginationOut.pages) {
    // If API echoes requested page or clamps but >= pages, then we expect
    // empty data when logically beyond last page.
    TestValidator.equals(
      "out-of-range: beyond last page should return empty data when current >= pages",
      pageOut.data.length,
      0,
    );
  } else {
    // If current is clamped within range, then we expect a normal slice
    TestValidator.predicate(
      "out-of-range: clamped page should still respect limit",
      pageOut.data.length > 0 && pageOut.data.length <= paginationOut.limit,
    );
  }
}
