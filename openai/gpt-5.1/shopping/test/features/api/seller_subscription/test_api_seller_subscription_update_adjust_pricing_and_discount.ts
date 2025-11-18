import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscription";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Adjust pricing and discount of an existing seller subscription while keeping
 * seller and plan fixed.
 *
 * Business context:
 *
 * - Admins manage seller subscriptions to monetization plans.
 * - Occasionally, admins negotiate a custom per-seller price and/or discount
 *   while keeping the plan and seller constant.
 * - This test verifies that the update endpoint correctly applies such negotiated
 *   pricing and persists metadata that documents the change.
 *
 * Scenario steps:
 *
 * 1. Admin joins via POST /auth/admin/join to acquire admin context and auth
 *    token.
 * 2. Admin creates a seller subscription plan via POST
 *    /shoppingMall/admin/sellerSubscriptionPlans with a known price_amount and
 *    currency.
 * 3. Admin creates a seller subscription via POST
 *    /shoppingMall/admin/sellerSubscriptions using:
 *
 *    - Seller_id from a random UUID (since no seller-create API is in scope but the
 *         backend allows any valid UUID that exists in DB or is mocked in
 *         tests),
 *    - Seller_subscription_plan_id from the created plan,
 *    - Status, started_at, currency, price_amount = plan.price_amount,
 *         discount_amount = 0, metadata_json = null.
 * 4. Admin builds an IShoppingMallSellerSubscription.IUpdate payload that:
 *
 *    - Keeps seller_id, seller_subscription_plan_id, status, started_at, ended_at,
 *         next_billing_at, currency unchanged (by omitting them from the update
 *         payload),
 *    - Sets price_amount to a new negotiated price that is >= 0 (e.g.,
 *         plan.price_amount * 0.8),
 *    - Sets discount_amount to a non-zero discount that is <= price_amount,
 *    - Sets metadata_json to a JSON string describing the negotiation reason.
 * 5. Admin calls PUT /shoppingMall/admin/sellerSubscriptions/{subscriptionId}
 *    using api.functional.shoppingMall.admin.sellerSubscriptions.update.
 * 6. The test validates via typia.assert that the response is a valid
 *    IShoppingMallSellerSubscription.
 * 7. The test then checks via TestValidator.equals and TestValidator.notEquals
 *    that:
 *
 *    - Currency is unchanged between original and updated subscription,
 *    - Seller_id and seller_subscription_plan_id are unchanged,
 *    - Started_at is unchanged,
 *    - Price_amount and discount_amount equal the newly negotiated values,
 *    - Metadata_json equals the new metadata string,
 *    - Updated_at in the updated subscription is different from the original (if
 *         present), indicating an update occurred.
 *
 * Note:
 *
 * - No type-mismatch or missing-required-field tests must be implemented.
 * - Only valid DTOs and business-consistent values are used.
 */
export async function test_api_seller_subscription_update_adjust_pricing_and_discount(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a seller subscription plan with known price and currency
  const planCreateBody: IShoppingMallSellerSubscriptionPlan.ICreate = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 100,
    is_active: true,
    effective_from: new Date().toISOString(),
    effective_until: null,
  };
  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planCreateBody },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);

  // 3. Create a baseline seller subscription tied to that plan
  // Since there is no seller creation API in scope, use a random UUID for seller_id.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const startedAt = new Date().toISOString();

  const subscriptionCreateBody: IShoppingMallSellerSubscription.ICreate = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: startedAt,
    ended_at: null,
    next_billing_at: null,
    currency: plan.currency as string & tags.MinLength<1>,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  };

  const createdSubscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert<IShoppingMallSellerSubscription>(createdSubscription);

  // 4. Build update payload adjusting only pricing and metadata
  const originalPrice = createdSubscription.price_amount;
  const newPrice = originalPrice * 0.8;
  const newDiscount = newPrice * 0.1;

  const metadataObject = {
    reason: "negotiated_discount",
    operator: adminAuthorized.email,
  };
  const newMetadataJson = JSON.stringify(metadataObject);

  const updateBody: IShoppingMallSellerSubscription.IUpdate = {
    price_amount: newPrice,
    discount_amount: newDiscount,
    metadata_json: newMetadataJson,
  };

  // 5. Call update endpoint
  const updatedSubscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.update(
      connection,
      {
        subscriptionId: createdSubscription.id,
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSellerSubscription>(updatedSubscription);

  // 6 & 7. Validate that pricing and metadata changed as expected, while key relations remain unchanged
  TestValidator.equals(
    "currency should remain unchanged after subscription pricing update",
    updatedSubscription.currency,
    createdSubscription.currency,
  );

  TestValidator.equals(
    "seller_id should remain unchanged after subscription pricing update",
    updatedSubscription.seller_id,
    createdSubscription.seller_id,
  );

  TestValidator.equals(
    "seller_subscription_plan_id should remain unchanged",
    updatedSubscription.seller_subscription_plan_id,
    createdSubscription.seller_subscription_plan_id,
  );

  TestValidator.equals(
    "started_at should remain unchanged",
    updatedSubscription.started_at,
    createdSubscription.started_at,
  );

  TestValidator.equals(
    "price_amount should reflect the newly negotiated value",
    updatedSubscription.price_amount,
    newPrice,
  );

  TestValidator.equals(
    "discount_amount should reflect the newly negotiated discount",
    updatedSubscription.discount_amount,
    newDiscount,
  );

  TestValidator.equals(
    "metadata_json should be updated to new negotiation metadata",
    updatedSubscription.metadata_json,
    newMetadataJson,
  );

  TestValidator.notEquals(
    "updated_at should change after subscription update",
    updatedSubscription.updated_at,
    createdSubscription.updated_at,
  );
}
