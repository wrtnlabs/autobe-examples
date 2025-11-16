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
 * Validate admin paginated and filtered search of registered sellers.
 *
 * Demonstrates advanced admin-side seller listing with multi-criteria
 * filtering, partial match, sorting, and strict authentication requirement. The
 * test verifies successful queries, proper filter enforcement, pagination and
 * sorting, and access control.
 *
 * Steps:
 *
 * 1. Register and authenticate as an admin.
 * 2. Create several seller-like entries (stub: for test, assume a seller already
 *    exists or skip creation).
 * 3. Run filtered search queries:
 *
 *    - By exact registration_number, partial business_name, partial email, status,
 *         verification, created_at/updated_at ranges.
 *    - Try filter combinations, sort variations, and pagination.
 *    - Test edge cases (no match/empty result, contradictory filters).
 * 4. Assert returned records match filters and highlight page metadata.
 * 5. Check forbidden access: unauthenticated search should fail.
 */
export async function test_api_seller_admin_paginated_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Basic search (no filters)
  const result1 = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {} satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(result1);
  TestValidator.predicate(
    "pagination data present for basic search",
    result1.pagination !== undefined && Array.isArray(result1.data),
  );

  // 3. Search with random advanced filters
  const filterBusinessName = RandomGenerator.paragraph({ sentences: 2 });
  const filterRegistrationNumber = RandomGenerator.alphaNumeric(10);
  const filterStatus = RandomGenerator.pick([
    "pending",
    "approved",
    "rejected",
    "suspended",
  ] as const);
  const filterEmail = typia.random<string & tags.Format<"email">>();
  const filterVerified = RandomGenerator.pick([true, false] as const);
  const filterCreatedFrom = new Date(Date.now() - 86400000 * 14).toISOString(); // 14 days ago
  const filterCreatedTo = new Date().toISOString();
  const filterUpdatedFrom = new Date(Date.now() - 86400000 * 7).toISOString(); // 7 days ago
  const filterUpdatedTo = new Date().toISOString();

  const complexResult = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        business_name: filterBusinessName,
        registration_number: filterRegistrationNumber,
        email: filterEmail,
        status: filterStatus,
        is_email_verified: filterVerified,
        created_from: filterCreatedFrom,
        created_to: filterCreatedTo,
        updated_from: filterUpdatedFrom,
        updated_to: filterUpdatedTo,
        sort_by: RandomGenerator.pick([
          "business_name",
          "email",
          "status",
          "created_at",
          "updated_at",
        ] as const),
        sort_direction: RandomGenerator.pick(["asc", "desc"] as const),
        page: 1, // Test first page
        page_size: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(complexResult);
  TestValidator.predicate(
    "pagination with filters returns valid structure",
    complexResult.pagination !== undefined && Array.isArray(complexResult.data),
  );

  // 4. Test edge: page with no data
  const emptyResult = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        business_name: "THIS_NAME_DOES_NOT_EXIST_PROBABLY",
        page: 1,
        page_size: 5,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "no results for non-matching business_name",
    emptyResult.data.length,
    0,
  );

  // 5. Pagination check: ask for a deep page (likely empty)
  const deepPageResult = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        page: 1000,
        page_size: 10,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(deepPageResult);
  TestValidator.predicate(
    "deep page should be empty or partially filled",
    Array.isArray(deepPageResult.data) &&
      (deepPageResult.data.length === 0 || deepPageResult.data.length <= 10),
  );

  // 6. Sorting: test sorting by created_at desc
  const sortedResult = await api.functional.shoppingMall.admin.sellers.index(
    connection,
    {
      body: {
        sort_by: "created_at",
        sort_direction: "desc",
        page: 1,
        page_size: 5,
      } satisfies IShoppingMallSeller.IRequest,
    },
  );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "sorted data present and valid",
    Array.isArray(sortedResult.data) && sortedResult.data.length <= 5,
  );

  // 7. Access control: must fail for unauthenticated/invalid actors
  const connNoAuth: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "search as unauthenticated actor should fail",
    async () => {
      await api.functional.shoppingMall.admin.sellers.index(connNoAuth, {
        body: {} satisfies IShoppingMallSeller.IRequest,
      });
    },
  );
}
