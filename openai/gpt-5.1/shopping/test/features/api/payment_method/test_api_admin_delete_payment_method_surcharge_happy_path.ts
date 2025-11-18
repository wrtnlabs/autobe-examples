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
 * Happy path: admin deletes a specific payment method surcharge and only that
 * surcharge disappears.
 *
 * Business flow:
 *
 * 1. Admin joins (POST /auth/admin/join) and gets authenticated.
 * 2. Admin creates a payment method (POST /shoppingMall/admin/paymentMethods).
 * 3. Admin creates two surcharge rules under that payment method (POST
 *    .../surcharges).
 * 4. Admin lists surcharges (PATCH .../surcharges) and verifies both exist.
 * 5. Admin deletes the first surcharge (DELETE .../surcharges/{surchargeId}).
 * 6. Admin lists surcharges again and verifies:
 *
 *    - The deleted surcharge is no longer present.
 *    - The second surcharge still exists.
 */
export async function test_api_admin_delete_payment_method_surcharge_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
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

  // 2. Create payment method
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 3,
      wordMax: 10,
    }),
    provider_type: "card_processor",
    allowed_currencies: "USD,KRW",
    allowed_countries: "US,KR",
    min_amount: 0,
    max_amount: 1_000_000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert(paymentMethod);

  // 3. Create two surcharge rules under the payment method
  const surchargeBody1 = {
    scope_code: "global",
    currency_code: "USD",
    min_order_amount: 0,
    max_order_amount: 100_000,
    fixed_fee_amount: 1.5,
    percentage_fee_rate: 2.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surcharge1: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargeBody1,
      },
    );
  typia.assert(surcharge1);

  const surchargeBody2 = {
    scope_code: "vip",
    currency_code: "KRW",
    min_order_amount: 1_000,
    max_order_amount: 500_000,
    fixed_fee_amount: 0,
    percentage_fee_rate: 1.2,
    is_platform_revenue: false,
    refundable_policy: "non_refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const surcharge2: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: surchargeBody2,
      },
    );
  typia.assert(surcharge2);

  // 4. List surcharges before deletion and confirm both are present
  const beforeList: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: {
          page: 0 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        } satisfies IShoppingMallPaymentMethodSurcharge.IRequest,
      },
    );
  typia.assert(beforeList);

  const beforeIds = beforeList.data.map((s) => s.id);

  TestValidator.predicate(
    "created surcharge1 must be present before deletion",
    beforeIds.includes(surcharge1.id),
  );
  TestValidator.predicate(
    "created surcharge2 must be present before deletion",
    beforeIds.includes(surcharge2.id),
  );

  // 5. Delete the first surcharge
  await api.functional.shoppingMall.admin.paymentMethods.surcharges.erase(
    connection,
    {
      paymentMethodCode: paymentMethod.code,
      surchargeId: surcharge1.id,
    },
  );

  // 6. List surcharges after deletion and confirm only the targeted one is gone
  const afterList: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: {
          page: 0 as number & tags.Type<"int32">,
          limit: 10 as number & tags.Type<"int32">,
        } satisfies IShoppingMallPaymentMethodSurcharge.IRequest,
      },
    );
  typia.assert(afterList);

  const afterIds = afterList.data.map((s) => s.id);

  TestValidator.predicate(
    "deleted surcharge1 must not be present after deletion",
    afterIds.includes(surcharge1.id) === false,
  );
  TestValidator.predicate(
    "surcharge2 must still be present after deleting surcharge1",
    afterIds.includes(surcharge2.id),
  );
}
