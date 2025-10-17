import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdmin";

export async function test_api_admin_search_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin to perform search operations
  const firstAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const firstAdmin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: firstAdminEmail,
        password: "SecurePassword123!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(firstAdmin);

  // Step 2: Create at least one admin account to establish system context
  const secondAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const secondAdmin: IEconomicBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: secondAdminEmail,
        password: "SecurePassword456!",
      } satisfies IEconomicBoardAdmin.IJoin,
    });
  typia.assert(secondAdmin);

  // Step 3: Use impossible search criteria that will yield no matching results
  // Impossible criteria: nonexistent email domain and future last login date
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const emptySearchResponse: IPageIEconomicBoardAdmin.ISummary =
    await api.functional.economicBoard.admin.admins.search(connection, {
      body: {
        email: "@nonexistent.com", // Cannot match any existing admin
        lastLoginFrom: futureDate, // Future date - no admin has logged in in the future
        lastLoginTo: futureDate, // Future date - no admin has logged in in the future
        page: 1,
        limit: 25,
      } satisfies IEconomicBoardAdmin.IRequest,
    });
  typia.assert(emptySearchResponse);

  // Step 4: Validate empty result set with correct pagination metadata
  // Must return data: [], totalPages: 0, total: 0, and valid pagination metadata without error
  TestValidator.equals(
    "empty search result data array",
    emptySearchResponse.data,
    [],
  );
  TestValidator.equals(
    "empty search result total records",
    emptySearchResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search result total pages",
    emptySearchResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search result current page",
    emptySearchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search result limit",
    emptySearchResponse.pagination.limit,
    25,
  );
}
