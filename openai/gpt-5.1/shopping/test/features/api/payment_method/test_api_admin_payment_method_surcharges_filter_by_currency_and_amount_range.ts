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

export async function test_api_admin_payment_method_surcharges_filter_by_currency_and_amount_range(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain an authenticated admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "Password123!" as string & tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payment method with a deterministic code
  const paymentMethodCode = "CARD_FILTER_TEST";
  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Card Filter Test Method",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_type: "card_processor",
    allowed_currencies: "USD,EUR",
    allowed_countries: "US,DE",
    min_amount: 0,
    max_amount: 2000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  TestValidator.equals(
    "created payment method code matches",
    paymentMethod.code,
    paymentMethodCode,
  );

  // 3. Create multiple surcharge configurations for that payment method
  // 3a) USD surcharge valid for orders 0–100
  const usdSurcharge0_100Body = {
    currency_code: "USD",
    min_order_amount: 0,
    max_order_amount: 100,
    fixed_fee_amount: 1.5,
    percentage_fee_rate: 0.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const usdSurcharge0_100: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode,
        body: usdSurcharge0_100Body,
      },
    );
  typia.assert(usdSurcharge0_100);

  // 3b) USD surcharge valid for orders 100–1000
  const usdSurcharge100_1000Body = {
    currency_code: "USD",
    min_order_amount: 100,
    max_order_amount: 1000,
    fixed_fee_amount: 2.5,
    percentage_fee_rate: 1.0,
    is_platform_revenue: false,
    refundable_policy: "non_refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const usdSurcharge100_1000: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode,
        body: usdSurcharge100_1000Body,
      },
    );
  typia.assert(usdSurcharge100_1000);

  // 3c) EUR surcharge with a broad range that would otherwise intersect
  const eurSurcharge0_1000Body = {
    currency_code: "EUR",
    min_order_amount: 0,
    max_order_amount: 1000,
    fixed_fee_amount: 3.0,
    percentage_fee_rate: 1.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const eurSurcharge0_1000: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode,
        body: eurSurcharge0_1000Body,
      },
    );
  typia.assert(eurSurcharge0_1000);

  // 4. Call PATCH /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges
  const filterRequestBody = {
    currencyCode: "USD",
    minOrderAmount: 50,
    maxOrderAmount: 150,
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const pageResult: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode,
        body: filterRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  const data = pageResult.data;

  // Ensure we have at least the two USD surcharges
  TestValidator.predicate(
    "at least one surcharge is returned",
    data.length >= 1,
  );

  // 5. Assert all returned surcharges belong to the expected payment method and match currency & range filters
  for (const summary of data) {
    // Basic type assertion is already done by typia.assert on the pageResult

    // payment method code must match
    TestValidator.equals(
      "surcharge.payment_method.code matches created payment method",
      summary.payment_method.code,
      paymentMethodCode,
    );

    // currency must be USD for this filter scenario
    TestValidator.equals(
      "surcharge currency_code must be USD",
      summary.currency_code ?? null,
      "USD",
    );

    const min = summary.min_order_amount ?? null;
    const max = summary.max_order_amount ?? null;

    // Check that [min, max] intersects with [50, 150]
    const intersects =
      (max === null || max >= 50) && (min === null || min <= 150);

    TestValidator.predicate(
      "surcharge amount range intersects [50,150]",
      intersects,
    );
  }

  // Confirm USD 0-100 and USD 100-1000 surcharges are present in the result set
  const usdIds = data.map((s) => s.id);

  TestValidator.predicate(
    "USD 0-100 surcharge appears in filtered results",
    usdIds.includes(usdSurcharge0_100.id),
  );

  TestValidator.predicate(
    "USD 100-1000 surcharge appears in filtered results",
    usdIds.includes(usdSurcharge100_1000.id),
  );

  // Ensure EUR surcharge is not returned
  TestValidator.predicate(
    "EUR surcharge not included when filtering by USD",
    !usdIds.includes(eurSurcharge0_1000.id),
  );

  // Basic pagination sanity checks
  TestValidator.equals("pagination current page is 0", pagination.current, 0);
  TestValidator.predicate(
    "pagination limit is at least number of returned items",
    pagination.limit >= data.length,
  );

  // 7. Optional: Negative scenario with currency having no surcharges (e.g., JPY)
  const emptyFilterRequestBody = {
    currencyCode: "JPY",
    minOrderAmount: 50,
    maxOrderAmount: 150,
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const emptyPageResult: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode,
        body: emptyFilterRequestBody,
      },
    );
  typia.assert(emptyPageResult);

  TestValidator.equals(
    "no surcharges returned for JPY filter",
    emptyPageResult.data.length,
    0,
  );

  TestValidator.equals(
    "pagination records is 0 for JPY filter",
    emptyPageResult.pagination.records,
    0,
  );
}
