import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethodSurcharge";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

/**
 * Verify surcharge search returns empty pages both when no rows exist and when
 * filters exclude all existing rows.
 *
 * Business context: Admins query surcharge configurations per payment method.
 * The search endpoint must behave predictably in edge cases, always returning a
 * well-formed pagination structure even when there are no matching records.
 * This test ensures that (a) an empty table and (b) an over‑filtered query both
 * yield an empty `data` array with `pagination.records === 0`, instead of
 * errors or malformed responses.
 *
 * Steps:
 *
 * 1. Join an admin account (POST /auth/admin/join) to obtain an authorized
 *    connection for admin-only operations.
 * 2. Create a payment method with a unique code (POST
 *    /shoppingMall/admin/paymentMethods).
 * 3. Call surcharge search for that payment method without any filters (PATCH
 *    .../surcharges) and assert that no records exist yet (records=0,
 *    data=[]).
 * 4. Create a concrete surcharge for the same payment method with a specific
 *    currency_code and amount range (POST .../surcharges).
 * 5. Search again using IRequest filters that deliberately cannot match the
 *    created surcharge (e.g., different currency and non‑overlapping order
 *    amount window) and assert that the endpoint still returns records=0 and
 *    data=[], demonstrating that empty results from filtering are handled as a
 *    normal success case.
 */
export async function test_api_admin_payment_method_surcharges_search_no_results_edge_case(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payment method with unique code
  const paymentMethodCode = `CARD_EMPTY_${RandomGenerator.alphaNumeric(8)}`;

  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Card Empty Test Method",
    description: "Payment method for surcharge empty-result edge case tests",
    provider_type: "card_processor",
    allowed_currencies: "USD,EUR",
    allowed_countries: "US,KR",
    min_amount: 0,
    max_amount: 100000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);
  TestValidator.equals(
    "created payment method code matches input",
    paymentMethod.code,
    paymentMethodCode,
  );

  // 3. Search surcharges when none exist
  const emptySearchRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const emptyPage: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode,
        body: emptySearchRequest,
      },
    );
  typia.assert(emptyPage);

  TestValidator.equals(
    "no surcharges: records must be 0",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "no surcharges: data must be an empty array",
    emptyPage.data.length,
    0,
  );

  // 4. Create a concrete surcharge for this payment method
  const surchargeCreateBody = {
    scope_code: "GLOBAL",
    currency_code: "USD",
    min_order_amount: 0,
    max_order_amount: 1000,
    fixed_fee_amount: 1.5,
    percentage_fee_rate: 2.9,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const createdSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode,
        body: surchargeCreateBody,
      },
    );
  typia.assert(createdSurcharge);
  TestValidator.equals(
    "created surcharge payment method code matches parent",
    createdSurcharge.paymentMethod.code,
    paymentMethodCode,
  );

  // 5. Search with filters that intentionally produce no matches
  const nonMatchingSearchRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    currencyCode: "EUR",
    minOrderAmount: 2000,
    maxOrderAmount: 5000,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const filteredEmptyPage: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode,
        body: nonMatchingSearchRequest,
      },
    );
  typia.assert(filteredEmptyPage);

  // Even though a surcharge exists, restrictive filters should yield 0 records.
  TestValidator.equals(
    "filtered search: records must be 0 when filters exclude all rows",
    filteredEmptyPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "filtered search: data must be an empty array when filters exclude all rows",
    filteredEmptyPage.data.length,
    0,
  );
}
