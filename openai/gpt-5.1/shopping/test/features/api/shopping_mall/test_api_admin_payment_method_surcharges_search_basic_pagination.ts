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
 * Validate basic pagination behavior when listing surcharges for a payment
 * method.
 *
 * Business goal: Ensure that an authenticated admin can search and paginate
 * surcharge configurations for a specific payment method using the `PATCH
 * /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges` endpoint,
 * and that pagination metadata and item scoping behave as expected.
 *
 * Steps:
 *
 * 1. Register a fresh admin via POST /auth/admin/join to obtain an authenticated
 *    admin context (token automatically applied to connection).
 * 2. Create a payment method via POST /shoppingMall/admin/paymentMethods and
 *    capture its business code.
 * 3. Seed at least three surcharge configurations for that payment method via POST
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges with
 *    varying fixed and percentage fee values.
 * 4. Call PATCH /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges
 *    with page=0 and limit=2 and verify pagination metadata and data length.
 * 5. Call the same endpoint with page=1 and limit=2 and verify that the second
 *    page returns the remaining records without any duplication between page 0
 *    and page 1.
 * 6. Optionally, request a page index beyond the available pages and verify that
 *    an empty data array is returned with consistent pagination metadata.
 */
export async function test_api_admin_payment_method_surcharges_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a payment method and capture its code
  const paymentMethodBody = {
    code: `CARD_BASIC_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 3. Seed at least three surcharge configurations for that payment method
  const createdSurcharges: IShoppingMallPaymentMethodSurcharge[] = [];

  const surchargeBodies: IShoppingMallPaymentMethodSurcharge.ICreate[] = [
    {
      currency_code: "KRW",
      fixed_fee_amount: 100,
      percentage_fee_rate: 0,
      is_platform_revenue: true,
      refundable_policy: "refundable",
    },
    {
      currency_code: "KRW",
      fixed_fee_amount: 0,
      percentage_fee_rate: 1.5,
      is_platform_revenue: false,
      refundable_policy: "non_refundable",
    },
    {
      currency_code: "KRW",
      fixed_fee_amount: 200,
      percentage_fee_rate: 2.5,
      is_platform_revenue: true,
      refundable_policy: "refundable",
    },
  ];

  for (const body of surchargeBodies) {
    const created: IShoppingMallPaymentMethodSurcharge =
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
        connection,
        {
          paymentMethodCode: paymentMethod.code,
          body,
        },
      );
    typia.assert(created);
    createdSurcharges.push(created);
  }

  // 4. Fetch page 0 with limit 2
  const page0RequestBody = {
    page: 0,
    limit: 2,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const page0: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: page0RequestBody,
      },
    );
  typia.assert(page0);

  // Validate pagination metadata for page 0
  TestValidator.equals("page 0 current index", page0.pagination.current, 0);
  TestValidator.equals("page 0 limit", page0.pagination.limit, 2);

  // We expect at least two surcharges in the first page when there are
  // at least three created in total, but there may be pre-existing data.
  TestValidator.predicate(
    "page 0 data length should be between 1 and limit",
    page0.data.length >= 1 && page0.data.length <= 2,
  );

  // Ensure all items belong to the created payment method
  for (const item of page0.data) {
    TestValidator.equals(
      "page 0 item payment method code",
      item.payment_method.code,
      paymentMethod.code,
    );
  }

  // 5. Fetch page 1 with the same limit 2
  const page1RequestBody = {
    page: 1,
    limit: 2,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const page1: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: page1RequestBody,
      },
    );
  typia.assert(page1);

  TestValidator.equals("page 1 current index", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);

  // Ensure all items in page 1 also belong to the created payment method
  for (const item of page1.data) {
    TestValidator.equals(
      "page 1 item payment method code",
      item.payment_method.code,
      paymentMethod.code,
    );
  }

  // Verify that there is no duplication of surcharge IDs across page 0 and page 1
  const idsPage0 = page0.data.map((d) => d.id);
  const idsPage1 = page1.data.map((d) => d.id);
  const combinedIds = [...idsPage0, ...idsPage1];
  const uniqueCount = new Set(combinedIds).size;

  TestValidator.predicate(
    "no duplicate surcharge IDs across first two pages",
    uniqueCount === combinedIds.length,
  );

  // 6. Optional: request a page index beyond available pages and verify empty data
  const totalPages = page0.pagination.pages;
  if (totalPages >= 1) {
    const beyondPageRequestBody = {
      page: totalPages,
      limit: 2,
    } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

    const beyond: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
        connection,
        {
          paymentMethodCode: paymentMethod.code,
          body: beyondPageRequestBody,
        },
      );
    typia.assert(beyond);

    TestValidator.equals(
      "beyond page current index",
      beyond.pagination.current,
      totalPages,
    );
    TestValidator.equals(
      "beyond page should have empty data",
      beyond.data.length,
      0,
    );
    TestValidator.equals(
      "beyond page total pages remains consistent",
      beyond.pagination.pages,
      page0.pagination.pages,
    );
  }
}
