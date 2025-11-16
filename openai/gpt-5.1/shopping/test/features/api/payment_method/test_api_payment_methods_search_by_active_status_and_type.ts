import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate platform admin payment method search with filters and sorting.
 *
 * Business goal: Ensure that a platform administrator can search configured
 * payment methods using `is_active` and `method_type` filters and receive a
 * correctly paginated and priority-sorted list. Also verify that removing
 * filters returns all created methods, still sorted as requested.
 *
 * Steps:
 *
 * 1. Register a new platform admin via auth.platformAdmin.join and rely on SDK
 *    auto-token wiring for subsequent admin-authorized calls.
 * 2. Create multiple payment methods via
 *    shoppingMall.platformAdmin.paymentMethods.create with deterministic
 *    attributes:
 *
 *    - Two card methods with distinct priorities where only one is active.
 *    - One bank method that is active.
 * 3. Call shoppingMall.platformAdmin.paymentMethods.index with an
 *    IShoppingMallPaymentMethod.IRequest body that sets:
 *
 *    - Page = 1
 *    - Limit large enough (e.g., 20)
 *    - Is_active = true
 *    - Method_type = "card"
 *    - Sort_field = "priority"
 *    - Sort_direction = "asc"
 * 4. Assert that:
 *
 *    - All returned items have is_active === true and method_type === "card".
 *    - The number of returned records and pagination.records is exactly the number
 *         of active card methods we created.
 *    - The data array is ordered by ascending priority with non-decreasing priority
 *         values.
 *    - Pagination.current and pagination.limit reflect the requested paging (noting
 *         that pagination.current is zero-based).
 * 5. Call shoppingMall.platformAdmin.paymentMethods.index again with filters
 *    relaxed (no is_active, no method_type) but same pagination and sorting,
 *    and assert that all created methods appear in the result and are sorted by
 *    priority.
 */
export async function test_api_payment_methods_search_by_active_status_and_type(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin; SDK will attach Authorization header
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create payment methods with known attributes
  // Card method 1: active, lower priority (should appear in filtered result)
  const cardActive =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: {
          code: `card_active_${RandomGenerator.alphaNumeric(6)}`,
          display_name: "Active Card Low Priority",
          description: "Active card payment method with low priority",
          provider_key: "provider_card_1",
          method_type: "card",
          currency_restriction: null,
          min_amount: null,
          max_amount: null,
          priority: 1 as number & tags.Type<"int32">,
          is_active: true,
          starts_at: null,
          ends_at: null,
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(cardActive);

  // Card method 2: inactive, higher priority (should NOT appear in filtered result)
  const cardInactive =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: {
          code: `card_inactive_${RandomGenerator.alphaNumeric(6)}`,
          display_name: "Inactive Card High Priority",
          description: "Inactive card payment method with higher priority",
          provider_key: "provider_card_2",
          method_type: "card",
          currency_restriction: null,
          min_amount: null,
          max_amount: null,
          priority: 2 as number & tags.Type<"int32">,
          is_active: false,
          starts_at: null,
          ends_at: null,
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(cardInactive);

  // Bank method: active, medium priority (should not match card filter but appear in unfiltered search)
  const bankActive =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: {
          code: `bank_active_${RandomGenerator.alphaNumeric(6)}`,
          display_name: "Active Bank Medium Priority",
          description: "Active bank payment method",
          provider_key: "provider_bank_1",
          method_type: "bank",
          currency_restriction: null,
          min_amount: null,
          max_amount: null,
          priority: 3 as number & tags.Type<"int32">,
          is_active: true,
          starts_at: null,
          ends_at: null,
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(bankActive);

  const created = [cardActive, cardInactive, bankActive];

  // 3. Filter search: active card methods sorted by ascending priority
  const filterRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    method_type: "card",
    is_active: true,
    sort_field: "priority",
    sort_direction: "asc",
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const filteredPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.index(
      connection,
      { body: filterRequestBody },
    );
  typia.assert(filteredPage);

  const filteredData = filteredPage.data;
  const expectedFiltered = created.filter(
    (m) => m.method_type === "card" && m.is_active === true,
  );

  // Assert basic counts
  TestValidator.equals(
    "filtered records count matches expected active card methods",
    filteredPage.pagination.records,
    expectedFiltered.length,
  );
  TestValidator.equals(
    "filtered data length matches pagination.records",
    filteredData.length,
    filteredPage.pagination.records,
  );

  // Assert pagination current (zero-based) and limit
  TestValidator.equals(
    "pagination.limit echoes requested limit",
    filteredPage.pagination.limit,
    filterRequestBody.limit,
  );
  TestValidator.equals(
    "pagination.current is zero-based for requested page 1",
    filteredPage.pagination.current,
    0,
  );

  // Assert filter conditions on each item
  for (const item of filteredData) {
    TestValidator.equals(
      "filtered item is_active must be true",
      item.is_active,
      true,
    );
    TestValidator.equals(
      "filtered item method_type must be card",
      item.method_type,
      "card",
    );
  }

  // Assert ascending priority order (non-decreasing)
  for (let i = 1; i < filteredData.length; ++i) {
    TestValidator.predicate(
      "filtered results sorted by ascending priority",
      filteredData[i - 1].priority <= filteredData[i].priority,
    );
  }

  // 4. Unfiltered search (no is_active or method_type) but with same paging and sorting
  const unfilteredRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sort_field: "priority",
    sort_direction: "asc",
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const unfilteredPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.index(
      connection,
      { body: unfilteredRequestBody },
    );
  typia.assert(unfilteredPage);

  const unfilteredData = unfilteredPage.data;

  // Every created method should appear somewhere in unfiltered results
  for (const method of created) {
    const found = unfilteredData.find((item) => item.id === method.id);
    TestValidator.predicate(
      `unfiltered results contain created method ${method.code}`,
      !!found,
    );
  }

  // And the list should be sorted by ascending priority
  for (let i = 1; i < unfilteredData.length; ++i) {
    TestValidator.predicate(
      "unfiltered results sorted by ascending priority",
      unfilteredData[i - 1].priority <= unfilteredData[i].priority,
    );
  }
}
