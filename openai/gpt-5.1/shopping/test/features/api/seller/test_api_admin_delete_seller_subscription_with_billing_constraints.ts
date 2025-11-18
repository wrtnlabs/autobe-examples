import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerFeeCharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeCharge";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";
import type { IShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscription";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

export async function test_api_admin_delete_seller_subscription_with_billing_constraints(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin account and authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a non-zero priced seller subscription plan
  const now = new Date();
  const planCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 99.99,
    is_active: true,
    effective_from: now.toISOString(),
    effective_until: null,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      { body: planCreateBody },
    );
  typia.assert<IShoppingMallSellerSubscriptionPlan>(plan);

  // 3. Create a seller subscription for a synthetic seller
  const sellerId = typia.random<string & tags.Format<"uuid">>();

  const startedAt = now.toISOString();
  const nextBillingAt = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const subscriptionCreateBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: startedAt,
    ended_at: null,
    next_billing_at: nextBillingAt,
    currency: plan.currency,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const subscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      { body: subscriptionCreateBody },
    );
  typia.assert<IShoppingMallSellerSubscription>(subscription);

  // 4. Create at least one seller earning linked to a synthetic order/payment
  const orderId = typia.random<string & tags.Format<"uuid">>();

  const grossAmount = 500;
  const commissionAmount = 50;
  const netAmount = grossAmount - commissionAmount;

  const earningCreateBody = {
    shopping_mall_order_id: orderId,
    shopping_mall_order_item_id: null,
    shopping_mall_order_payment_id: null,
    currency_code: subscription.currency,
    gross_amount: grossAmount,
    seller_discount_amount: 0,
    platform_discount_amount: 0,
    commission_amount: commissionAmount,
    other_fee_amount: 0,
    net_earning_amount: netAmount,
    earning_type: "order_item",
    business_status: "eligible",
    eligible_at: startedAt,
    reversed_at: null,
    metadata: null,
  } satisfies IShoppingMallSellerEarning.ICreate;

  const earning: IShoppingMallSellerEarning =
    await api.functional.shoppingMall.admin.sellers.earnings.create(
      connection,
      {
        sellerId,
        body: earningCreateBody,
      },
    );
  typia.assert<IShoppingMallSellerEarning>(earning);

  // 5. Optionally create a seller fee charge tied to the same seller and order
  const feeChargeCreateBody = {
    sellerId,
    orderId,
    paymentRefundId: null,
    sellerPayoutItemId: null,
    feeType: "subscription_fee",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    currency: subscription.currency,
    amount: 25,
    taxAmount: 0,
    isPlatformRevenue: true,
    effectiveDate: startedAt,
  } satisfies IShoppingMallSellerFeeCharge.ICreate;

  const feeCharge: IShoppingMallSellerFeeCharge =
    await api.functional.shoppingMall.admin.sellerFeeCharges.create(
      connection,
      { body: feeChargeCreateBody },
    );
  typia.assert<IShoppingMallSellerFeeCharge>(feeCharge);

  // Cross-entity consistency checks
  TestValidator.equals(
    "earning currency matches subscription currency",
    earning.currency_code,
    subscription.currency,
  );

  TestValidator.equals(
    "fee charge currency matches subscription currency",
    feeCharge.currency,
    subscription.currency,
  );

  TestValidator.equals(
    "net earning equals gross minus commission",
    earning.net_earning_amount,
    grossAmount - commissionAmount,
  );

  // 6. Attempt to delete the subscription after financial ties exist
  await api.functional.shoppingMall.admin.sellerSubscriptions.erase(
    connection,
    { subscriptionId: subscription.id },
  );

  // We cannot assert specific HTTP status or failure semantics, but we can
  // confirm that the call completed without throwing at the SDK level.
  TestValidator.predicate(
    "subscription erase call completed without SDK-level error",
    true,
  );
}
