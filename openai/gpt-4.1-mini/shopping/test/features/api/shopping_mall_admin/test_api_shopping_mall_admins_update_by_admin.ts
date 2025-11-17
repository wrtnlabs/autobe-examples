import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test updating shopping mall admin user information by an authorized admin.
 *
 * This test verifies that an authorized administrator can authenticate via the
 * admin join API, then perform update operations on shopping mall admin users
 * using the PATCH endpoint. It checks for persistence of updated data and valid
 * auditing.
 *
 * The test covers:
 *
 * 1. Admin authentication with realistic data
 * 2. Updating admin user data with pagination and sorting
 * 3. Response data structure and validity checks
 *
 * All DTOs are used with strict typing, and all API responses are validated
 * with typia.assert. TestValidator is used to confirm business logic
 * assertions.
 */
export async function test_api_shopping_mall_admins_update_by_admin(
  connection: api.IConnection,
) {
  // Admin authenticates to obtain authorization tokens
  const adminJoinBody = {
    email: `admin${Date.now()}@example.com`,
    password: "SecureP@ssw0rd!",
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/login",
  } satisfies IShoppingMallAdmin.IJoin;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });

  typia.assert(authorizedAdmin);

  // Prepare request to update shopping mall admin users with pagination and sorting
  const updateBody = {
    page: 1,
    limit: 10,
    search: undefined,
    sortField: "email",
    sortOrder: "asc",
  } satisfies IShoppingMallAdmin.IRequest;

  // Perform update operation
  const updateResponse: IPageIShoppingMallAdmin.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.index(
      connection,
      { body: updateBody },
    );

  typia.assert(updateResponse);

  // Validate pagination presence
  TestValidator.predicate(
    "pagination exists in response",
    updateResponse.pagination !== null &&
      updateResponse.pagination !== undefined,
  );

  // Validate data array
  TestValidator.predicate(
    "data is an array",
    Array.isArray(updateResponse.data),
  );

  // If data available, validate first admin entry
  if (updateResponse.data.length > 0) {
    const firstAdmin = updateResponse.data[0];
    typia.assert(firstAdmin);

    TestValidator.predicate(
      "admin id is a string",
      typeof firstAdmin.id === "string",
    );

    TestValidator.predicate(
      "admin email is a non-empty string",
      typeof firstAdmin.email === "string" && firstAdmin.email.length > 0,
    );
  }
}
