import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppAdminUser";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate pagination boundary behavior when listing admin users.
 *
 * Business context: Administrative consoles typically offer a paginated view of
 * all admin accounts. This test ensures that the pagination API for admin users
 * behaves sensibly at the first page and when a caller requests a page index
 * that is beyond the last available page. The goal is to guarantee stable
 * behavior (no server errors), consistent total record counting, and
 * predictable handling of out-of-range page requests.
 *
 * Scenario steps:
 *
 * 1. Initialize global system settings so the environment mimics a configured
 *    production state. At least one ITodoAppSystemSetting record is created via
 *    POST /todoApp/adminUser/systemSettings.
 * 2. Register an initial adminUser by calling POST /auth/adminUser/join. The SDK
 *    automatically sets connection.headers.Authorization from the returned
 *    IAuthorizationToken, so subsequent adminUser-protected calls are
 *    authenticated.
 * 3. Seed additional admin users by invoking /auth/adminUser/join multiple times
 *    with distinct emails. Each call both creates a new admin record and
 *    updates the Authorization header to that new admin, which is fine because
 *    any authenticated admin can call the adminUsers.index endpoint. Ensure the
 *    total number of admins strictly exceeds the page limit used later (e.g.,
 *    create at least 7 admins for limit = 5).
 * 4. As the currently authenticated admin, request the first page of admin users
 *    by calling PATCH /todoApp/adminUser/adminUsers with an
 *    ITodoAppAdminUser.IRequest body where:
 *
 *    - Page = 1
 *    - Limit = 5
 *    - All filter fields (email, status, orderByCreatedAt, createdFrom, createdTo)
 *         are left undefined so the call returns an unfiltered list. Verify:
 *    - The response matches IPageITodoAppAdminUser.ISummary via typia.assert.
 *    - Pagination.current equals 1.
 *    - Pagination.limit equals the requested limit (5).
 *    - Data.length is >= 0 and <= pagination.limit.
 *    - Pagination.records is >= data.length.
 *    - Pagination.pages is consistent with records and limit: if pagination.records
 *         === 0 then pagination.pages === 0; otherwise pagination.pages >= 1,
 *         and pagination.records <= pagination.pages * pagination.limit.
 * 5. Compute an out-of-range page index based on the first response: const
 *    oversizedPage = pagination.pages + 1 (or 2 if pages is 0). This guarantees
 *    the requested page is strictly greater than the last page when records >
 *    0. Call PATCH /todoApp/adminUser/adminUsers again with the same limit and
 *    page = oversizedPage. Verify for the second response:
 *
 *    - Typia.assert passes for IPageITodoAppAdminUser.ISummary.
 *    - Pagination.records is identical to the value observed in the first response.
 *    - Pagination.limit equals the requested limit (5).
 *    - Pagination.current is either: (a) the requested oversizedPage (API echoes
 *         requested page even when out-of-range), or (b) the last valid page
 *         number from the first response (pagination.pages), meaning the API
 *         clamps to the last page.
 *    - If pagination.current equals oversizedPage, then data.length must be 0,
 *         indicating an empty page beyond the end of the list.
 *    - If pagination.current equals the original pagination.pages, then data.length
 *         must be > 0 and <= limit, representing the last page.
 *
 * The test must never attempt to send invalid types or rely on specific HTTP
 * status codes. It should focus strictly on verifying stable, predictable
 * pagination semantics and consistent record counting across multiple calls.
 */
export async function test_api_admin_adminusers_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Create at least one system setting to simulate configured environment.
  const settingCreateBody = {
    key: `max_active_todos_${RandomGenerator.alphaNumeric(8)}`,
    value: "100",
    type: "int",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    group: "limits",
    enabled: true,
  } satisfies ITodoAppSystemSetting.ICreate;

  const systemSetting =
    await api.functional.todoApp.adminUser.systemSettings.create(connection, {
      body: settingCreateBody,
    });
  typia.assert<ITodoAppSystemSetting>(systemSetting);

  // 2. Register a primary admin user (also authenticates the connection).
  const primaryAdminJoinBody = {
    email: `${RandomGenerator.alphaNumeric(12)}@example.com`,
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    status: "active",
    ip: "127.0.0.1",
    href: "https://admin.todoapp.test/signup" as string & tags.Format<"uri">,
    referrer: "https://admin.todoapp.test/" as string & tags.Format<"uri">,
  } satisfies ITodoAppAdminUser.IJoin;

  const primaryAdmin = await api.functional.auth.adminUser.join(connection, {
    body: primaryAdminJoinBody,
  });
  typia.assert<ITodoAppAdminUser.IAuthorized>(primaryAdmin);
  typia.assert<IAuthorizationToken>(primaryAdmin.token);

  // 3. Seed additional admin users so that total records exceed our page limit.
  const pageLimit: number & tags.Type<"int32"> & tags.Minimum<1> = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const seedCount = pageLimit + 3; // ensure records > limit

  for (let i = 0; i < seedCount; i++) {
    const seedJoinBody = {
      email: `${RandomGenerator.alphaNumeric(12)}+${i}@example.com`,
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      status: "active",
      ip: "127.0.0.1",
      href: "https://admin.todoapp.test/seed" as string & tags.Format<"uri">,
      referrer: "https://admin.todoapp.test/system-settings" as string &
        tags.Format<"uri">,
    } satisfies ITodoAppAdminUser.IJoin;

    const seededAdmin = await api.functional.auth.adminUser.join(connection, {
      body: seedJoinBody,
    });
    typia.assert<ITodoAppAdminUser.IAuthorized>(seededAdmin);
  }

  // 4. Request the first page of admin users.
  const firstPageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageLimit,
  } satisfies ITodoAppAdminUser.IRequest;

  const firstPage = await api.functional.todoApp.adminUser.adminUsers.index(
    connection,
    {
      body: firstPageRequestBody,
    },
  );
  typia.assert<IPageITodoAppAdminUser.ISummary>(firstPage);

  const firstPagination = firstPage.pagination;
  const firstData = firstPage.data;

  // Basic pagination validations for the first page.
  TestValidator.equals(
    "first page: current page should be 1",
    firstPagination.current,
    1,
  );
  TestValidator.equals(
    "first page: limit should equal requested limit",
    firstPagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "first page: data length must be between 0 and limit",
    firstData.length >= 0 && firstData.length <= firstPagination.limit,
  );
  TestValidator.predicate(
    "first page: records must be >= data length",
    firstPagination.records >= firstData.length,
  );

  if (firstPagination.records === 0) {
    TestValidator.equals(
      "first page: when records is 0, pages must be 0",
      firstPagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "first page: when records > 0, pages must be >= 1",
      firstPagination.pages >= 1,
    );
    TestValidator.predicate(
      "first page: records must be <= pages * limit",
      firstPagination.records <= firstPagination.pages * firstPagination.limit,
    );
  }

  // 5. Request an out-of-range page.
  const oversizedPageRaw =
    firstPagination.pages === 0 ? 2 : firstPagination.pages + 1;
  const oversizedPage = oversizedPageRaw as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const oversizedRequestBody = {
    page: oversizedPage,
    limit: pageLimit,
  } satisfies ITodoAppAdminUser.IRequest;

  const oversizedPageResult =
    await api.functional.todoApp.adminUser.adminUsers.index(connection, {
      body: oversizedRequestBody,
    });
  typia.assert<IPageITodoAppAdminUser.ISummary>(oversizedPageResult);

  const oversizedPagination = oversizedPageResult.pagination;
  const oversizedData = oversizedPageResult.data;

  // Ensure records and limit are consistent with the first call.
  TestValidator.equals(
    "oversized page: records must remain constant",
    oversizedPagination.records,
    firstPagination.records,
  );
  TestValidator.equals(
    "oversized page: limit must equal requested limit",
    oversizedPagination.limit,
    pageLimit,
  );

  // The API may either echo the requested page or clamp to the last page.
  const lastPage = firstPagination.pages;
  TestValidator.predicate(
    "oversized page: current must be either requested page or last page",
    oversizedPagination.current === oversizedPageRaw ||
      oversizedPagination.current === lastPage,
  );

  if (oversizedPagination.current === oversizedPageRaw) {
    // API chooses to honor oversized page and return an empty slice.
    TestValidator.equals(
      "oversized page honored: data must be empty",
      oversizedData.length,
      0,
    );
  } else if (oversizedPagination.current === lastPage) {
    // API clamps to last page; expect non-empty last page when records > 0.
    if (oversizedPagination.records > 0) {
      TestValidator.predicate(
        "clamped to last page: data length must be > 0 and <= limit",
        oversizedData.length > 0 &&
          oversizedData.length <= oversizedPagination.limit,
      );
    } else {
      // When there are no records at all, lastPage === 0 and data should be empty.
      TestValidator.equals(
        "no records: clamped last page should have empty data",
        oversizedData.length,
        0,
      );
    }
  }
}
