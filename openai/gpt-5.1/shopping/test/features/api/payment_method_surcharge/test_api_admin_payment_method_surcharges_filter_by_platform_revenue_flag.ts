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

export async function test_api_admin_payment_method_surcharges_filter_by_platform_revenue_flag(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a dedicated payment method
  const paymentMethodCode = `CARD_REV_FLAG_${RandomGenerator.alphaNumeric(8)}`;
  const paymentMethodBody = {
    code: paymentMethodCode,
    display_name: "Card with revenue flag test",
    description:
      "Payment method used for testing isPlatformRevenue filter semantics on surcharges.",
    provider_type: "card_processor",
    allowed_currencies: "KRW",
    allowed_countries: "KR",
    min_amount: 0,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. Create two surcharges for the payment method (one platform revenue, one pass-through)
  const surchargePlatformBody = {
    scope_code: "GLOBAL",
    currency_code: "KRW",
    min_order_amount: 0,
    max_order_amount: 100000,
    fixed_fee_amount: 1000,
    percentage_fee_rate: 1.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surchargePassThroughBody = {
    scope_code: "GLOBAL",
    currency_code: "KRW",
    min_order_amount: 0,
    max_order_amount: 100000,
    fixed_fee_amount: 500,
    percentage_fee_rate: 0.5,
    is_platform_revenue: false,
    refundable_policy: "non_refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surchargePlatform: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargePlatformBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surchargePlatform);

  const surchargePassThrough: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargePassThroughBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surchargePassThrough);

  // 4. Query surcharges filtered by isPlatformRevenue = true
  const requestTrue = {
    page: 0,
    limit: 10,
    currencyCode: "KRW",
    scopeCode: "GLOBAL",
    isPlatformRevenue: true,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const pageTrue: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: requestTrue,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodSurcharge.ISummary>(pageTrue);

  // Basic sanity: at least one result
  TestValidator.predicate(
    "isPlatformRevenue=true search should return at least one surcharge",
    pageTrue.data.length > 0,
  );

  // All returned surcharges must be platform revenue and for the same payment method
  for (const summary of pageTrue.data) {
    TestValidator.predicate(
      "all surcharges in isPlatformRevenue=true result must be platform revenue",
      summary.is_platform_revenue === true,
    );
    TestValidator.equals(
      "all surcharges in isPlatformRevenue=true result must belong to the created payment method",
      summary.payment_method.code,
      paymentMethod.code,
    );
  }

  // The specifically created platform surcharge must be present
  const foundPlatform = pageTrue.data.find(
    (s) => s.id === surchargePlatform.id,
  );
  TestValidator.predicate(
    "platform-revenue surcharge should appear in isPlatformRevenue=true result",
    foundPlatform !== undefined,
  );

  // The pass-through surcharge must not be present
  const foundPassThroughInTrue = pageTrue.data.find(
    (s) => s.id === surchargePassThrough.id,
  );
  TestValidator.predicate(
    "pass-through surcharge must not appear in isPlatformRevenue=true result",
    foundPassThroughInTrue === undefined,
  );

  // 5. Query surcharges filtered by isPlatformRevenue = false
  const requestFalse = {
    page: 0,
    limit: 10,
    currencyCode: "KRW",
    scopeCode: "GLOBAL",
    isPlatformRevenue: false,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const pageFalse: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: requestFalse,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodSurcharge.ISummary>(pageFalse);

  TestValidator.predicate(
    "isPlatformRevenue=false search should return at least one surcharge",
    pageFalse.data.length > 0,
  );

  for (const summary of pageFalse.data) {
    TestValidator.predicate(
      "all surcharges in isPlatformRevenue=false result must be pass-through",
      summary.is_platform_revenue === false,
    );
    TestValidator.equals(
      "all surcharges in isPlatformRevenue=false result must belong to the created payment method",
      summary.payment_method.code,
      paymentMethod.code,
    );
  }

  const foundPassThrough = pageFalse.data.find(
    (s) => s.id === surchargePassThrough.id,
  );
  TestValidator.predicate(
    "pass-through surcharge should appear in isPlatformRevenue=false result",
    foundPassThrough !== undefined,
  );

  const foundPlatformInFalse = pageFalse.data.find(
    (s) => s.id === surchargePlatform.id,
  );
  TestValidator.predicate(
    "platform-revenue surcharge must not appear in isPlatformRevenue=false result",
    foundPlatformInFalse === undefined,
  );
}
