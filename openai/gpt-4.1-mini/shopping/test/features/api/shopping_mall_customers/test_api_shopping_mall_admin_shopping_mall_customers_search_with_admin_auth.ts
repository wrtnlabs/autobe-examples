import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validates the admin-authenticated search endpoint for shopping mall
 * customers.
 *
 * The test first performs admin registration and authentication through the
 * "/auth/admin/join" endpoint, ensuring that the admin token is correctly
 * issued and utilized.
 *
 * Then, it performs a PATCH request on
 * "/shoppingMall/admin/shoppingMallCustomers" with various search criteria,
 * including email filters and createdAt date ranges, combined with pagination
 * parameters.
 *
 * It validates that the response includes proper pagination metadata and the
 * returned customer summaries match the search criteria.
 */
export async function test_api_shopping_mall_admin_shopping_mall_customers_search_with_admin_auth(
  connection: api.IConnection,
) {
  // 1. Register a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "password123";
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/home",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuthorized);
  TestValidator.predicate(
    "admin token exists",
    typeof adminAuthorized.token.access === "string" &&
      adminAuthorized.token.access.length > 0,
  );

  // 2. Perform customer search with filters and pagination
  // Use current date as reference, createdAtStart set 7 days ago, createdAtEnd is now
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdAtStart = sevenDaysAgo.toISOString();
  const createdAtEnd = now.toISOString();
  // Use a realistic partial email filter from adminEmail
  const emailFilter = adminEmail.split("@")[0];

  const response: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.shoppingMallCustomers.index(
      connection,
      {
        body: {
          email: emailFilter,
          createdAtStart: createdAtStart,
          createdAtEnd: createdAtEnd,
          page: 1,
          pageSize: 5,
        } satisfies IShoppingMallCustomer.IRequest,
      },
    );
  typia.assert(response);

  // 3. Validate pagination metadata
  const pagination: IPage.IPagination = response.pagination;
  TestValidator.predicate("page is at least 1", pagination.current >= 1);
  TestValidator.predicate("page size is positive", pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("pages count is non-negative", pagination.pages >= 0);

  // 4. Validate that each returned customer summary matches the email filter
  for (const customer of response.data) {
    typia.assert(customer);
    TestValidator.predicate(
      `customer email '${customer.email}' contains filter '${emailFilter}'`,
      customer.email.includes(emailFilter),
    );
  }
}
