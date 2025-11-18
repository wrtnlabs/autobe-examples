import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

/**
 * Happy-path: admin reads back a surcharge configuration they have just
 * created.
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) so that the SDK configures an
 *    authenticated admin connection.
 * 2. Admin creates a payment method (POST /shoppingMall/admin/paymentMethods).
 * 3. Admin creates a surcharge for that payment method (POST
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges).
 * 4. Admin reads the surcharge back (GET
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges/{surchargeId}).
 * 5. Test asserts that the fetched surcharge matches what was created, including
 *    linkage to the correct payment method.
 */
export async function test_api_admin_payment_method_surcharge_read_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Use explicit, valid URIs for href and referrer to satisfy format constraints
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
    // Leave ip undefined to let backend derive it; matches IShoppingMallAdminJoin.ICreate
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates a payment method
  const paymentMethodCode = `card_gateway_${RandomGenerator.alphaNumeric(8)}`;
  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Korean Card Gateway",
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 8,
    }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1_000_000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const createdPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(createdPaymentMethod);

  TestValidator.equals(
    "payment method code should match create payload",
    createdPaymentMethod.code,
    paymentMethodCreateBody.code,
  );

  // 3. Admin creates a surcharge for that payment method
  const surchargeCreateBody = {
    scope_code: "default_scope",
    currency_code: "KRW",
    min_order_amount: 10_000,
    max_order_amount: 500_000,
    fixed_fee_amount: 500,
    percentage_fee_rate: 2.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const createdSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: createdPaymentMethod.code,
        body: surchargeCreateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(createdSurcharge);

  TestValidator.equals(
    "created surcharge payment method code should match parent payment method",
    createdSurcharge.paymentMethod.code,
    createdPaymentMethod.code,
  );

  // 4. Admin reads the surcharge back
  const fetchedSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.at(
      connection,
      {
        paymentMethodCode: createdPaymentMethod.code,
        surchargeId: createdSurcharge.id,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(fetchedSurcharge);

  // 5. Assert that fetched surcharge matches what was created
  TestValidator.equals(
    "surcharge id should round-trip",
    fetchedSurcharge.id,
    createdSurcharge.id,
  );

  TestValidator.equals(
    "fetched surcharge should be linked to the same payment method code",
    fetchedSurcharge.paymentMethod.code,
    createdPaymentMethod.code,
  );

  TestValidator.equals(
    "scope_code should round-trip",
    fetchedSurcharge.scope_code ?? null,
    createdSurcharge.scope_code ?? null,
  );

  TestValidator.equals(
    "currency_code should round-trip",
    fetchedSurcharge.currency_code ?? null,
    createdSurcharge.currency_code ?? null,
  );

  TestValidator.equals(
    "min_order_amount should round-trip",
    fetchedSurcharge.min_order_amount ?? null,
    createdSurcharge.min_order_amount ?? null,
  );

  TestValidator.equals(
    "max_order_amount should round-trip",
    fetchedSurcharge.max_order_amount ?? null,
    createdSurcharge.max_order_amount ?? null,
  );

  TestValidator.equals(
    "fixed_fee_amount should round-trip",
    fetchedSurcharge.fixed_fee_amount ?? null,
    createdSurcharge.fixed_fee_amount ?? null,
  );

  TestValidator.equals(
    "percentage_fee_rate should round-trip",
    fetchedSurcharge.percentage_fee_rate ?? null,
    createdSurcharge.percentage_fee_rate ?? null,
  );

  TestValidator.equals(
    "refundable_policy should round-trip",
    fetchedSurcharge.refundable_policy ?? null,
    createdSurcharge.refundable_policy ?? null,
  );

  TestValidator.equals(
    "is_platform_revenue should be persisted correctly",
    fetchedSurcharge.is_platform_revenue,
    surchargeCreateBody.is_platform_revenue,
  );
}
