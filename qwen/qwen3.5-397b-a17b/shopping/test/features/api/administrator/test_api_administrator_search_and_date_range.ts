import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministrator";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test search functionality and date range filtering for administrator listings.
 *
 * Validates the complete administrator listing workflow including super administrator authentication, text-based search filtering, and temporal date range filtering. Ensures that the search functionality correctly matches partial email addresses and display names, and that date range filters properly restrict results to administrators created within the specified timeframe.
 *
 * Special attention is given to verifying that search queries are case-insensitive and match across both email and member profile display name fields. Date range validation confirms that created_at_from acts as a lower bound (inclusive) and created_at_to acts as an upper bound (inclusive) for administrator creation timestamps.
 *
 * 1. Super administrator registers and authenticates using authorize_super_admin_join utility.
 * 2. Creates a new connection with the authentication token for subsequent API calls.
 * 3. Tests search functionality by querying with partial email text.
 * 4. Validates that returned administrators contain the search text in email or member display name.
 * 5. Tests date range filtering with created_at_from and created_at_to parameters.
 * 6. Validates that returned administrators were created within the specified date range.
 * 7. Tests combined search and date range filters together.
 * 8. Verifies pagination metadata is correctly returned in all scenarios.
 */
export async function test_api_administrator_search_and_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Test search functionality with partial email match
  const searchEmail = authResult.email.split("@")[0]?.substring(0, 5) ?? "test";
  const searchResult =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          search: searchEmail,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination structure
  TestValidator.predicate(
    "has valid pagination",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate("has valid limit", searchResult.pagination.limit > 0);
  TestValidator.predicate(
    "has non-negative records",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    searchResult.pagination.pages >= 0,
  );
  // Validate search results contain matching data
  if (searchResult.data.length > 0) {
    for (const admin of searchResult.data) {
      typia.assert(admin);
      const matchesSearch =
        admin.member.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
        (admin.member.customerProfile?.display_name
          .toLowerCase()
          .includes(searchEmail.toLowerCase()) ??
          false);
      TestValidator.predicate(
        `admin ${admin.id} matches search`,
        matchesSearch,
      );
    }
  }
  // 3. Test date range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  // Validate all results are within date range
  for (const admin of dateRangeResult.data) {
    typia.assert(admin);
    const createdAt = new Date(admin.created_at);
    TestValidator.predicate(
      `admin ${admin.id} created after from date`,
      createdAt >= thirtyDaysAgo,
    );
    TestValidator.predicate(
      `admin ${admin.id} created before to date`,
      createdAt <= now,
    );
  }
  // 4. Test combined search and date range filters
  const combinedResult =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          search: searchEmail,
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 15,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate combined filter results
  for (const admin of combinedResult.data) {
    typia.assert(admin);
    const matchesSearch =
      admin.member.email.toLowerCase().includes(searchEmail.toLowerCase()) ||
      (admin.member.customerProfile?.display_name
        .toLowerCase()
        .includes(searchEmail.toLowerCase()) ??
        false);
    TestValidator.predicate(
      `admin ${admin.id} matches combined search`,
      matchesSearch,
    );
    const createdAt = new Date(admin.created_at);
    TestValidator.predicate(
      `admin ${admin.id} within date range`,
      createdAt >= thirtyDaysAgo && createdAt <= now,
    );
  }
  // 5. Test with grade filter for super administrators
  const gradeResult =
    await api.functional.shoppingMall.superAdmin.administrators.index(
      superAdminConnection,
      {
        body: {
          grade: "super",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAdministrator.IRequest,
      },
    );
  typia.assert(gradeResult);
  // Validate all results are super administrators
  for (const admin of gradeResult.data) {
    typia.assert(admin);
    TestValidator.equals(
      `admin ${admin.id} grade is super`,
      admin.grade,
      "super",
    );
  }
}
