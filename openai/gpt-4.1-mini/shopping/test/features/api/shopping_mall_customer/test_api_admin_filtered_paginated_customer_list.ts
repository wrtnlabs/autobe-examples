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
 * Tests the admin functionalities to join and authenticate, then query the
 * filtered and paginated customer list from the shopping mall backend.
 *
 * 1. Admin joins with required registration data, receiving authorization token.
 * 2. Performs a PATCH request through the admin customers endpoint with
 *    comprehensive filtering and pagination input.
 * 3. Validates the pagination meta information and consistency.
 * 4. Validates that all returned customer summaries match the search criteria and
 *    are sorted according to order parameters.
 *
 * This end-to-end test verifies the admin's capability to manage customer lists
 * with advanced search and pagination features vital to administrative
 * systems.
 */
export async function test_api_admin_filtered_paginated_customer_list(
  connection: api.IConnection,
) {
  // Step 1: Admin join to authenticate
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(6)}@example.com`;
  const adminPassword = "admin-password";
  const adminFullName = RandomGenerator.name();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Query paginated, filtered customer list
  const page = 1 satisfies number & tags.Type<"int32">;
  const limit = 10 satisfies number & tags.Type<"int32">;

  // Date filters: created after 60 days before current date, before now plus 1 hour
  const now = new Date();
  const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
  const createdAfter = new Date(now.getTime() - sixtyDaysMs).toISOString();
  const createdBefore = new Date(now.getTime() + 3600 * 1000).toISOString();

  // Use searchEmail substring to simulate filtering by gmail domain
  const searchEmail = "@example.com";

  const includeDeleted = false;

  const orderBy = "email" as "email" | "nickname" | "created_at";
  const orderDirection = "asc" as "asc" | "desc";

  const requestBody = {
    page,
    limit,
    searchEmail,
    createdAfter,
    createdBefore,
    includeDeleted,
    orderBy,
    orderDirection,
  } satisfies IShoppingMallCustomer.IRequest;

  const pageResult: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.admin.customers.index(connection, {
      body: requestBody,
    });

  typia.assert(pageResult);

  // Step 3: Validate pagination meta
  const pagination = pageResult.pagination;
  TestValidator.predicate(
    "pagination current page is correct",
    pagination.current === page,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination total records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination total pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent with records and limit",
    pagination.pages === Math.ceil(pagination.records / limit),
  );

  // Step 4: Validate the returned customer list
  for (const customer of pageResult.data) {
    typia.assert(customer);

    // Validate email contains the searchEmail substring
    TestValidator.predicate(
      `customer email contains '${searchEmail}'`,
      customer.email.includes(searchEmail),
    );

    // Validate created_at is within createdAfter and createdBefore
    TestValidator.predicate(
      "customer created_at >= createdAfter",
      customer.created_at >= createdAfter,
    );
    TestValidator.predicate(
      "customer created_at <= createdBefore",
      customer.created_at <= createdBefore,
    );
  }

  // Step 5: Validate ordering according to orderBy and orderDirection
  if (pageResult.data.length >= 2) {
    for (let i = 1; i < pageResult.data.length; i++) {
      const prev = pageResult.data[i - 1];
      const curr = pageResult.data[i];

      let comparison = 0;
      if (orderBy === "email") {
        comparison = prev.email.localeCompare(curr.email);
      } else if (orderBy === "nickname") {
        comparison = prev.nickname.localeCompare(curr.nickname);
      } else if (orderBy === "created_at") {
        comparison = prev.created_at.localeCompare(curr.created_at);
      }

      if (orderDirection === "asc") {
        TestValidator.predicate(
          `order ascending check at index ${i - 1}`,
          comparison <= 0,
        );
      } else {
        TestValidator.predicate(
          `order descending check at index ${i - 1}`,
          comparison >= 0,
        );
      }
    }
  }
}
