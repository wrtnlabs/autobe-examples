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
 * Validate that deleting a payment method surcharge is scoped to its payment
 * method.
 *
 * Business goal: Ensure that DELETE
 * /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges/{surchargeId}
 * removes only the targeted surcharge that belongs to the given payment method,
 * and does not affect surcharges configured under a different payment method.
 *
 * Flow:
 *
 * 1. Admin joins (POST /auth/admin/join) to obtain admin context (token
 *    auto-applied).
 * 2. Admin creates two payment methods with distinct codes.
 * 3. Admin creates surcharge A under the first payment method.
 * 4. Admin creates surcharge B under the second payment method.
 * 5. Admin lists surcharges for both methods and verifies that A and B are
 *    present.
 * 6. Admin deletes surcharge A via DELETE for the first method.
 * 7. Admin lists surcharges again:
 *
 *    - For the first method: surcharge A must be gone.
 *    - For the second method: surcharge B must still exist and remain unchanged.
 */
export async function test_api_admin_delete_payment_method_surcharge_scoped_to_payment_method(
  connection: api.IConnection,
) {
  // 1. Admin join (authentication)
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create two payment methods with distinct codes
  const paymentMethodCode1 = "card_online";
  const paymentMethodCode2 = "bank_transfer";

  const paymentMethodBody1 = {
    code: paymentMethodCode1,
    display_name: "Card Online",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod1: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody1,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod1);

  const paymentMethodBody2 = {
    code: paymentMethodCode2,
    display_name: "Bank Transfer",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_type: "bank_gateway",
    allowed_currencies: "USD,EUR",
    allowed_countries: "US,DE",
    min_amount: null,
    max_amount: null,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod2: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody2,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod2);

  TestValidator.equals(
    "first payment method code should match",
    paymentMethod1.code,
    paymentMethodCode1,
  );
  TestValidator.equals(
    "second payment method code should match",
    paymentMethod2.code,
    paymentMethodCode2,
  );

  // 3. Create surcharge A under the first payment method
  const surchargeABody = {
    scope_code: "KR",
    currency_code: "KRW",
    min_order_amount: 10000,
    max_order_amount: 500000,
    fixed_fee_amount: 1000,
    percentage_fee_rate: 1.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surchargeA: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethodCode1,
        body: surchargeABody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surchargeA);

  // 4. Create surcharge B under the second payment method
  const surchargeBBody = {
    scope_code: "US",
    currency_code: "USD",
    min_order_amount: 5000,
    max_order_amount: 300000,
    fixed_fee_amount: 200,
    percentage_fee_rate: 2.9,
    is_platform_revenue: false,
    refundable_policy: "non_refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surchargeB: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethodCode2,
        body: surchargeBBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surchargeB);

  // 5. Initial listing for both methods and verification of presence
  const listRequest = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallPaymentMethodSurcharge.IRequest;

  const page1: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethodCode1,
        body: listRequest,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodSurcharge.ISummary>(page1);

  const page2: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethodCode2,
        body: listRequest,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodSurcharge.ISummary>(page2);

  const foundA = page1.data.find((s) => s.id === surchargeA.id);
  typia.assertGuard(foundA!);
  TestValidator.equals(
    "surcharge A should appear in first payment method listing",
    foundA!.id,
    surchargeA.id,
  );
  TestValidator.equals(
    "surcharge A payment method code should match first method",
    foundA!.payment_method.code,
    paymentMethodCode1,
  );

  const foundB = page2.data.find((s) => s.id === surchargeB.id);
  typia.assertGuard(foundB!);
  TestValidator.equals(
    "surcharge B should appear in second payment method listing",
    foundB!.id,
    surchargeB.id,
  );
  TestValidator.equals(
    "surcharge B payment method code should match second method",
    foundB!.payment_method.code,
    paymentMethodCode2,
  );

  // Snapshot of surcharge B fields for later comparison
  const snapshotB = {
    id: foundB!.id,
    paymentMethodCode: foundB!.payment_method.code,
    fixed_fee_amount: foundB!.fixed_fee_amount ?? null,
    percentage_fee_rate: foundB!.percentage_fee_rate ?? null,
    is_platform_revenue: foundB!.is_platform_revenue,
    refundable_policy: foundB!.refundable_policy ?? null,
  };

  // 6. Delete surcharge A scoped to the first payment method
  await api.functional.shoppingMall.admin.paymentMethods.surcharges.erase(
    connection,
    {
      paymentMethodCode: paymentMethodCode1,
      surchargeId: surchargeA.id,
    },
  );

  // 7. Re-list surcharges for first method and confirm A is gone
  const page1After: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethodCode1,
        body: listRequest,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodSurcharge.ISummary>(page1After);

  const existsAAfter = page1After.data.some((s) => s.id === surchargeA.id);
  TestValidator.predicate(
    "surcharge A should be removed from first payment method after deletion",
    () => existsAAfter === false,
  );

  // 8. Re-list surcharges for second method and verify B is still present and unchanged
  const page2After: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethodCode2,
        body: listRequest,
      },
    );
  typia.assert<IPageIShoppingMallPaymentMethodSurcharge.ISummary>(page2After);

  const foundBAfter = page2After.data.find((s) => s.id === surchargeB.id);
  typia.assertGuard(foundBAfter!);

  TestValidator.equals(
    "surcharge B should still exist under second payment method after deletion of A",
    foundBAfter!.id,
    snapshotB.id,
  );
  TestValidator.equals(
    "surcharge B payment method code should remain the same",
    foundBAfter!.payment_method.code,
    snapshotB.paymentMethodCode,
  );
  TestValidator.equals(
    "surcharge B fixed fee amount should remain unchanged",
    foundBAfter!.fixed_fee_amount ?? null,
    snapshotB.fixed_fee_amount,
  );
  TestValidator.equals(
    "surcharge B percentage fee rate should remain unchanged",
    foundBAfter!.percentage_fee_rate ?? null,
    snapshotB.percentage_fee_rate,
  );
  TestValidator.equals(
    "surcharge B platform revenue flag should remain unchanged",
    foundBAfter!.is_platform_revenue,
    snapshotB.is_platform_revenue,
  );
  TestValidator.equals(
    "surcharge B refundable policy should remain unchanged",
    foundBAfter!.refundable_policy ?? null,
    snapshotB.refundable_policy,
  );
}
