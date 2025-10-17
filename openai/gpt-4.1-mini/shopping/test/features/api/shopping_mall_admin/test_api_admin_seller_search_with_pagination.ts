import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test administrative search and retrieval of seller accounts with complex
 * filters and pagination.
 *
 * This test performs the following sequence:
 *
 * 1. Authenticate as an admin user by joining with realistic admin creation data.
 * 2. Use the authenticated admin token to call the seller search endpoint with
 *    filters such as email, company name, and status, along with pagination
 *    parameters.
 * 3. Validate that the authentication response contains valid token and admin
 *    details.
 * 4. Validate that the search result contains sellers matching the input criteria
 *    and correct pagination metadata.
 *
 * This test ensures the admin role authentication requirement and verifies both
 * filtering and pagination functionality.
 */
export async function test_api_admin_seller_search_with_pagination(
  connection: api.IConnection,
) {
  // 1. Admin join to authenticate as admin user
  const adminCreationBody = {
    email: `admin.${RandomGenerator.alphaNumeric(6)}@example.com`,
    password_hash: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(2),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreationBody,
    });
  typia.assert(admin);

  // 2. Perform seller search with filters and pagination
  // Construct filtering criteria with realistic values; all optional and nullable fields included explicitly
  const requestBody = {
    email: admin.email, // filtering by admin email to simulate common filtering
    company_name: null, // explicitly null
    contact_name: null, // explicitly null
    phone_number: null, // explicitly null
    status: "active", // exact enum string
    email_verified: null, // explicitly null
    page: 1,
    limit: 10,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallSeller.IRequest;

  const result: IPageIShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.index(connection, {
      body: requestBody,
    });
  typia.assert(result);

  // 3. Validate pagination metadata
  TestValidator.equals(
    "Current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("Limit should be 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "Page count should be non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "Record count should be non-negative",
    result.pagination.records >= 0,
  );

  // 4. Validate sellers array
  TestValidator.predicate(
    "All sellers should be valid",
    result.data.every((seller) => {
      typia.assert(seller);
      return true;
    }),
  );
}
