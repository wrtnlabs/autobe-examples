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
 * Validate partial update behavior of admin payment method surcharge
 * configuration.
 *
 * Business flow:
 *
 * 1. Register an admin via /auth/admin/join to obtain authenticated admin context.
 * 2. Create a payment method via /shoppingMall/admin/paymentMethods and capture
 *    its code.
 * 3. Create a surcharge for that payment method with many configured fields.
 * 4. Perform a first partial update that changes only some fields while omitting
 *    others.
 * 5. Validate that only updated fields changed while others remained as originally
 *    created.
 * 6. Perform a second partial update that explicitly sets some fields to null.
 * 7. Validate that fields explicitly set to null are cleared, while untouched
 *    fields keep their prior values.
 * 8. Ensure created_at is stable and updated_at is monotonic (update times
 *    change).
 */
export async function test_api_admin_payment_method_surcharge_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a payment method and capture its business code
  const paymentMethodBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_type: "card_processor",
    allowed_currencies: "KRW,USD",
    allowed_countries: "KR,US",
    min_amount: 1000,
    max_amount: 1000000,
    status: "active",
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 3. Create an initial surcharge with many configured fields
  const createSurchargeBody = {
    scope_code: "GLOBAL",
    currency_code: "KRW",
    min_order_amount: 5000,
    max_order_amount: 500000,
    fixed_fee_amount: 500,
    percentage_fee_rate: 2.5,
    is_platform_revenue: true,
    refundable_policy: "refundable",
  } satisfies IShoppingMallPaymentMethodSurcharge.ICreate;

  const initialSurcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        body: createSurchargeBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(initialSurcharge);

  // 4. First partial update: change fixed_fee_amount and is_platform_revenue only
  const firstUpdateBody = {
    fixed_fee_amount: 1000,
    is_platform_revenue: false,
  } satisfies IShoppingMallPaymentMethodSurcharge.IUpdate;

  const afterFirstUpdate: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.update(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        surchargeId: initialSurcharge.id,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(afterFirstUpdate);

  // Validate that changed fields are updated
  TestValidator.equals(
    "fixed_fee_amount should be updated in first partial update",
    afterFirstUpdate.fixed_fee_amount,
    firstUpdateBody.fixed_fee_amount,
  );
  TestValidator.equals(
    "is_platform_revenue should be updated in first partial update",
    afterFirstUpdate.is_platform_revenue,
    firstUpdateBody.is_platform_revenue,
  );

  // Validate that untouched fields remain the same as initial
  TestValidator.equals(
    "scope_code must remain unchanged after first update",
    afterFirstUpdate.scope_code,
    initialSurcharge.scope_code,
  );
  TestValidator.equals(
    "currency_code must remain unchanged after first update",
    afterFirstUpdate.currency_code,
    initialSurcharge.currency_code,
  );
  TestValidator.equals(
    "min_order_amount must remain unchanged after first update",
    afterFirstUpdate.min_order_amount,
    initialSurcharge.min_order_amount,
  );
  TestValidator.equals(
    "max_order_amount must remain unchanged after first update",
    afterFirstUpdate.max_order_amount,
    initialSurcharge.max_order_amount,
  );
  TestValidator.equals(
    "percentage_fee_rate must remain unchanged after first update",
    afterFirstUpdate.percentage_fee_rate,
    initialSurcharge.percentage_fee_rate,
  );
  TestValidator.equals(
    "refundable_policy must remain unchanged after first update",
    afterFirstUpdate.refundable_policy,
    initialSurcharge.refundable_policy,
  );

  // Validate timestamps: created_at should be stable, updated_at should change
  TestValidator.equals(
    "created_at must remain identical after first update",
    afterFirstUpdate.created_at,
    initialSurcharge.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change after first update",
    afterFirstUpdate.updated_at,
    initialSurcharge.updated_at,
  );

  // 5. Second partial update: explicitly null some nullable fields
  const secondUpdateBody = {
    refundable_policy: null,
    min_order_amount: null,
  } satisfies IShoppingMallPaymentMethodSurcharge.IUpdate;

  const afterSecondUpdate: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.update(
      connection,
      {
        paymentMethodCode: paymentMethod.code,
        surchargeId: initialSurcharge.id,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(afterSecondUpdate);

  // Fields explicitly set to null should be cleared
  TestValidator.equals(
    "refundable_policy must be cleared to null after second update",
    afterSecondUpdate.refundable_policy,
    secondUpdateBody.refundable_policy,
  );
  TestValidator.equals(
    "min_order_amount must be cleared to null after second update",
    afterSecondUpdate.min_order_amount,
    secondUpdateBody.min_order_amount,
  );

  // Fields untouched in second update must keep their values from afterFirstUpdate
  TestValidator.equals(
    "fixed_fee_amount must remain the same as afterFirstUpdate in second update",
    afterSecondUpdate.fixed_fee_amount,
    afterFirstUpdate.fixed_fee_amount,
  );
  TestValidator.equals(
    "is_platform_revenue must remain the same as afterFirstUpdate in second update",
    afterSecondUpdate.is_platform_revenue,
    afterFirstUpdate.is_platform_revenue,
  );
  TestValidator.equals(
    "scope_code must remain the same as afterFirstUpdate in second update",
    afterSecondUpdate.scope_code,
    afterFirstUpdate.scope_code,
  );
  TestValidator.equals(
    "currency_code must remain the same as afterFirstUpdate in second update",
    afterSecondUpdate.currency_code,
    afterFirstUpdate.currency_code,
  );
  TestValidator.equals(
    "max_order_amount must remain the same as afterFirstUpdate in second update",
    afterSecondUpdate.max_order_amount,
    afterFirstUpdate.max_order_amount,
  );
  TestValidator.equals(
    "percentage_fee_rate must remain the same as afterFirstUpdate in second update",
    afterSecondUpdate.percentage_fee_rate,
    afterFirstUpdate.percentage_fee_rate,
  );

  // Timestamp expectations after second update
  TestValidator.equals(
    "created_at must remain identical after second update",
    afterSecondUpdate.created_at,
    initialSurcharge.created_at,
  );
  TestValidator.notEquals(
    "updated_at must change between first and second update",
    afterSecondUpdate.updated_at,
    afterFirstUpdate.updated_at,
  );
}
