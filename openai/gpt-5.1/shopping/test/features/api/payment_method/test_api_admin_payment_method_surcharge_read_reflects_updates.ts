import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

export async function test_api_admin_payment_method_surcharge_read_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authorization context and tokens.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method that will own the surcharge.
  const paymentMethodCode: string = `card_gateway_${RandomGenerator.alphabets(8)}`;

  const paymentMethodCreateBody = {
    code: paymentMethodCode,
    display_name: "Card Gateway KR",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  TestValidator.equals(
    "created payment method code should match requested code",
    paymentMethod.code,
    paymentMethodCode,
  );

  // 3. Create an initial surcharge for this payment method with deterministic values.
  const initialSurchargeCreateBody = {
    scope_code: "global_scope_initial",
    currency_code: "KRW",
    min_order_amount: 1000,
    max_order_amount: 100000,
    fixed_fee_amount: 1000,
    // omit percentage_fee_rate so it remains undefined/null in DB
    is_platform_revenue: true,
    refundable_policy: "refundable_initial",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const createdSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: initialSurchargeCreateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(createdSurcharge);

  // Snapshot baseline values for later comparison.
  const originalSurchargeId: string = createdSurcharge.id;
  const originalCreatedAt: string = createdSurcharge.created_at;
  const originalUpdatedAt: string = createdSurcharge.updated_at;

  const originalScopeCode = createdSurcharge.scope_code;
  const originalCurrencyCode = createdSurcharge.currency_code;
  const originalMinOrderAmount = createdSurcharge.min_order_amount;
  const originalMaxOrderAmount = createdSurcharge.max_order_amount;
  const originalFixedFeeAmount = createdSurcharge.fixed_fee_amount;
  const originalPercentageFeeRate = createdSurcharge.percentage_fee_rate;
  const originalIsPlatformRevenue = createdSurcharge.is_platform_revenue;
  const originalRefundablePolicy = createdSurcharge.refundable_policy;

  // Sanity check that the created surcharge is attached to the expected payment method.
  TestValidator.equals(
    "surcharge should be attached to the created payment method",
    createdSurcharge.paymentMethod.code,
    paymentMethod.code,
  );

  // 4. Update the surcharge configuration with new values for some fields.
  const updatedFixedFeeAmount = 2000;
  const updatedPercentageFeeRate = 2.5;
  const updatedMinOrderAmount = 2000;
  const updatedIsPlatformRevenue = !originalIsPlatformRevenue;

  const surchargeUpdateBody = {
    // leave scope_code unchanged by omitting it
    // leave currency_code unchanged by omitting it
    min_order_amount: updatedMinOrderAmount,
    // leave max_order_amount unchanged by omitting it
    fixed_fee_amount: updatedFixedFeeAmount,
    percentage_fee_rate: updatedPercentageFeeRate,
    is_platform_revenue: updatedIsPlatformRevenue,
    // leave refundable_policy unchanged by omitting it
  } satisfies IShoppingMallPaymentMethodSurcharge.IUpdate;

  const updatedSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.update(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        surchargeId: originalSurchargeId,
        body: surchargeUpdateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(updatedSurcharge);

  // 5. Read the surcharge again via GET.
  const readSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.at(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        surchargeId: originalSurchargeId,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(readSurcharge);

  // 6. Assertions: identifiers and parent linkage remain stable.
  TestValidator.equals(
    "surcharge id remains stable after update",
    readSurcharge.id,
    originalSurchargeId,
  );

  TestValidator.equals(
    "parent payment method code remains the same on read",
    readSurcharge.paymentMethod.code,
    paymentMethod.code,
  );

  // Updated fields should reflect new values.
  TestValidator.equals(
    "fixed_fee_amount should reflect updated value",
    readSurcharge.fixed_fee_amount,
    updatedFixedFeeAmount,
  );

  TestValidator.equals(
    "percentage_fee_rate should reflect updated non-null value",
    readSurcharge.percentage_fee_rate,
    updatedPercentageFeeRate,
  );

  TestValidator.equals(
    "min_order_amount should reflect updated value",
    readSurcharge.min_order_amount,
    updatedMinOrderAmount,
  );

  TestValidator.equals(
    "is_platform_revenue should reflect updated toggle",
    readSurcharge.is_platform_revenue,
    updatedIsPlatformRevenue,
  );

  // Unchanged fields should retain original values.
  TestValidator.equals(
    "scope_code should remain unchanged after update",
    readSurcharge.scope_code,
    originalScopeCode,
  );

  TestValidator.equals(
    "currency_code should remain unchanged after update",
    readSurcharge.currency_code,
    originalCurrencyCode,
  );

  TestValidator.equals(
    "max_order_amount should remain unchanged after update",
    readSurcharge.max_order_amount,
    originalMaxOrderAmount,
  );

  TestValidator.equals(
    "refundable_policy should remain unchanged after update",
    readSurcharge.refundable_policy,
    originalRefundablePolicy,
  );

  // Percentage fee rate was initially undefined or null; we only know it should differ now.
  TestValidator.notEquals(
    "percentage_fee_rate should differ from original after update",
    readSurcharge.percentage_fee_rate,
    originalPercentageFeeRate,
  );

  // 7. Timestamp monotonicity and consistency.
  TestValidator.equals(
    "created_at should remain unchanged after update",
    readSurcharge.created_at,
    originalCreatedAt,
  );

  const originalUpdatedAtTime = new Date(originalUpdatedAt).getTime();
  const updatedUpdatedAtTime = new Date(updatedSurcharge.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be equal or later than original updated_at",
    updatedUpdatedAtTime >= originalUpdatedAtTime,
  );

  TestValidator.equals(
    "GET should reflect latest updated_at from update response",
    readSurcharge.updated_at,
    updatedSurcharge.updated_at,
  );

  // 8. Read vs update structural consistency (ignoring nested paymentMethod summary differences).
  TestValidator.equals(
    "read surcharge should structurally match updated surcharge (excluding paymentMethod summary)",
    readSurcharge,
    updatedSurcharge,
    (key) => key === "paymentMethod",
  );
}
