import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

/**
 * Validate pagination boundary behavior for guest user listing.
 *
 * Business purpose:
 *
 * - Ensure PATCH /todoApp/guestUser/guestUsers behaves robustly when clients
 *   request pages at and beyond the available range.
 * - Confirm that out-of-range page requests do not cause errors and instead
 *   return an empty data set with consistent pagination metadata.
 *
 * Steps:
 *
 * 1. Join as a guest user via POST /auth/guestUser/join to establish a guestUser
 *    authorization context and configure the connection token.
 * 2. Call the listing endpoint with page = 1 and a small limit to obtain a
 *    baseline pagination snapshot.
 * 3. If there are no records, verify internal pagination consistency (records = 0,
 *    pages = 0, data empty) and finish.
 * 4. If there are records and pages >= 1, call the listing endpoint again with
 *    page = pages + 1 (out-of-range) and the same limit.
 * 5. Assert that the out-of-range page response:
 *
 *    - Succeeds without error.
 *    - Has data as an empty array.
 *    - Preserves records, pages, and limit from the baseline snapshot.
 *    - Has a non-negative current page index that is not greater than pages.
 * 6. Optionally, call the endpoint with page = pages (last page) and verify that
 *    the last page is non-empty (when records > 0) and size is within the
 *    configured limit while preserving pagination metadata.
 */
export async function test_api_guest_user_list_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Establish guestUser authorization via join endpoint
  const joinBody = {
    // display_name is optional; we can provide a simple test value.
    display_name: "pagination-boundary-tester",
  } satisfies ITodoAppGuestUser.IJoin;

  const authorized: ITodoAppGuestUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Call listing endpoint with page = 1 and a small limit
  const initialRequest = {
    page: 1,
    limit: 5,
  } satisfies ITodoAppGuestUser.IRequest;

  const firstPage: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.guestUser.guestUsers.index(connection, {
      body: initialRequest,
    });
  typia.assert(firstPage);

  const basePagination: IPage.IPagination = firstPage.pagination;
  const baseRecords = basePagination.records;
  const basePages = basePagination.pages;
  const baseLimit = basePagination.limit;

  // Sanity checks on baseline pagination
  TestValidator.predicate(
    "baseline current page is non-negative",
    () => basePagination.current >= 0,
  );
  TestValidator.predicate(
    "baseline pages is non-negative",
    () => basePages >= 0,
  );
  TestValidator.predicate(
    "baseline limit is non-negative",
    () => baseLimit >= 0,
  );

  if (baseRecords === 0) {
    // 3. No data: verify internal consistency and finish
    TestValidator.equals("no-records case: pages should be zero", basePages, 0);
    TestValidator.equals(
      "no-records case: data should be empty",
      firstPage.data.length,
      0,
    );
    return;
  }

  // When there are records, we expect at least one page
  TestValidator.predicate(
    "records>0 case: pages should be at least 1",
    () => basePages >= 1,
  );

  // 4. Out-of-range page request: page = basePages + 1
  const outOfRangePage = basePages + 1;
  const outOfRangeRequest = {
    page: outOfRangePage,
    limit: baseLimit,
  } satisfies ITodoAppGuestUser.IRequest;

  const outOfRangeResult: IPageITodoAppGuestuser.ISummary =
    await api.functional.todoApp.guestUser.guestUsers.index(connection, {
      body: outOfRangeRequest,
    });
  typia.assert(outOfRangeResult);

  const outPagination: IPage.IPagination = outOfRangeResult.pagination;

  // 4-a. Data must be empty for clearly out-of-range page
  TestValidator.equals(
    "out-of-range page should return empty data",
    outOfRangeResult.data.length,
    0,
  );

  // 4-b. Records and pages must remain consistent
  TestValidator.equals(
    "out-of-range page preserves records",
    outPagination.records,
    baseRecords,
  );
  TestValidator.equals(
    "out-of-range page preserves pages",
    outPagination.pages,
    basePages,
  );
  TestValidator.equals(
    "out-of-range page preserves limit",
    outPagination.limit,
    baseLimit,
  );

  // 4-c. current must be non-negative and not exceed pages (normalized or echoed)
  TestValidator.predicate(
    "out-of-range current page is non-negative",
    () => outPagination.current >= 0,
  );
  TestValidator.predicate(
    "out-of-range current page is not greater than total pages",
    () => outPagination.current <= outPagination.pages,
  );

  // 5. Optionally, validate last page behavior when basePages > 0
  if (basePages > 0) {
    const lastPageRequest = {
      page: basePages,
      limit: baseLimit,
    } satisfies ITodoAppGuestUser.IRequest;

    const lastPage: IPageITodoAppGuestuser.ISummary =
      await api.functional.todoApp.guestUser.guestUsers.index(connection, {
        body: lastPageRequest,
      });
    typia.assert(lastPage);

    const lastPagination = lastPage.pagination;

    // Metadata consistency
    TestValidator.equals(
      "last page preserves records",
      lastPagination.records,
      baseRecords,
    );
    TestValidator.equals(
      "last page preserves pages",
      lastPagination.pages,
      basePages,
    );
    TestValidator.equals(
      "last page preserves limit",
      lastPagination.limit,
      baseLimit,
    );

    // When records>0 and pages>0, we expect last page to be non-empty
    TestValidator.predicate(
      "last page should contain at least one record",
      () => lastPage.data.length > 0,
    );
    TestValidator.predicate(
      "last page size must not exceed limit",
      () => lastPage.data.length <= baseLimit,
    );
  }
}
