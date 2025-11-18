import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate admin-driven updates of subscription plan currency and price.
 *
 * Business goals:
 *
 * - Prove that an authenticated admin can update the `currency` and
 *   `price_amount` fields of an existing seller subscription plan.
 * - Verify that such updates keep immutable identifiers (like `id` and `code`)
 *   stable while changing only targeted mutable fields.
 * - Exercise negative-path validation where a plan update with nonsensical
 *   pricing (negative price) or clearly invalid currency strings is rejected by
 *   the backend without altering persisted monetary fields.
 *
 * High level workflow implemented in this test:
 *
 * 1. Admin self-registration via POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Creation of a baseline seller subscription plan via POST
 *    /shoppingMall/admin/sellerSubscriptionPlans with a valid ISO currency
 *    (e.g., "USD") and positive `price_amount`.
 * 3. Successful update of that plan via PUT
 *    /shoppingMall/admin/sellerSubscriptionPlans/{planCode}, modifying
 *    `currency` and `price_amount` while leaving immutable identity fields
 *    unchanged.
 * 4. A negative-price update attempt that must fail.
 * 5. An obviously invalid-currency update attempt that must fail.
 * 6. Re-reading the plan via a fresh update round-trip response to ensure the
 *    invalid attempts did not affect persisted monetary fields.
 */
export async function test_api_seller_subscription_plan_update_currency_and_price_with_validation(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline seller subscription plan
  const initialCurrency = "USD";
  const initialPrice = 100.0;

  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: initialCurrency,
    price_amount: initialPrice,
    is_active: true,
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const createdPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdPlan);

  TestValidator.equals(
    "created plan should use initial currency and price",
    {
      currency: createdPlan.currency,
      price_amount: createdPlan.price_amount,
    },
    {
      currency: initialCurrency,
      price_amount: initialPrice,
    },
  );

  // 3. Successful update of currency and price_amount
  const updatedCurrency = "EUR";
  const updatedPrice = 150.0;

  const updateBodyValid = {
    currency: updatedCurrency,
    price_amount: updatedPrice,
  } satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;

  const updatedPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
      connection,
      {
        planCode: createdPlan.code,
        body: updateBodyValid,
      },
    );
  typia.assert(updatedPlan);

  // Verify identifiers remain stable while currency/price change
  TestValidator.equals(
    "plan id should remain unchanged after valid update",
    updatedPlan.id,
    createdPlan.id,
  );
  TestValidator.equals(
    "plan code should remain unchanged after valid update",
    updatedPlan.code,
    createdPlan.code,
  );
  TestValidator.equals(
    "plan currency should be updated",
    updatedPlan.currency,
    updatedCurrency,
  );
  TestValidator.equals(
    "plan price_amount should be updated",
    updatedPlan.price_amount,
    updatedPrice,
  );

  // 4. Negative price update attempt (must be rejected)
  const invalidNegativePriceBody = {
    price_amount: -1.0,
  } satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;

  await TestValidator.error("negative price update should fail", async () => {
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
      connection,
      {
        planCode: createdPlan.code,
        body: invalidNegativePriceBody,
      },
    );
  });

  // 5. Invalid currency update attempt (must be rejected)
  const invalidCurrencyBody = {
    currency: "INVALID_CCY_CODE_@@@",
  } satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;

  await TestValidator.error("invalid currency update should fail", async () => {
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
      connection,
      {
        planCode: createdPlan.code,
        body: invalidCurrencyBody,
      },
    );
  });

  // 6. Re-fetch plan state via another successful no-op update
  const reloadBody = {} satisfies IShoppingMallSellerSubscriptionPlan.IUpdate;
  const reloadedPlan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.update(
      connection,
      {
        planCode: createdPlan.code,
        body: reloadBody,
      },
    );
  typia.assert(reloadedPlan);

  TestValidator.equals(
    "plan currency must remain as last valid updated currency after invalid attempts",
    reloadedPlan.currency,
    updatedCurrency,
  );
  TestValidator.equals(
    "plan price_amount must remain as last valid updated price after invalid attempts",
    reloadedPlan.price_amount,
    updatedPrice,
  );
}
