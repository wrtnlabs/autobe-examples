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
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerEarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEarning";
import type { IShoppingMallSellerFeeCharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerFeeCharge";
import type { IShoppingMallSellerPayoutBatch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutBatch";
import type { IShoppingMallSellerPayoutItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayoutItem";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscription";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

export async function test_api_admin_updates_fee_charge_classification_and_description(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an admin token.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.shoppingmall.test/join" as string & tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller joins to create a seller account.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.shoppingmall.test/join" as string &
      tags.Format<"uri">,
    referrer: "https://shoppingmall.test/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorized.id;

  // 3. Admin creates a seller subscription plan.
  const now = new Date();
  const effectiveFrom = new Date(now.getTime() - 1000 * 60 * 60).toISOString();
  const effectiveUntil = new Date(
    now.getTime() + 1000 * 60 * 60 * 24,
  ).toISOString();

  const planCreateBody = {
    code: `PLAN_${RandomGenerator.alphaNumeric(8)}`,
    name: "Standard Seller Plan",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    billing_period: "monthly",
    currency: "USD",
    price_amount: 49.99,
    is_active: true,
    effective_from: effectiveFrom,
    effective_until: effectiveUntil,
  } satisfies IShoppingMallSellerSubscriptionPlan.ICreate;

  const plan: IShoppingMallSellerSubscriptionPlan =
    await api.functional.shoppingMall.admin.sellerSubscriptionPlans.create(
      connection,
      {
        body: planCreateBody,
      },
    );
  typia.assert(plan);

  // 4. Admin creates a seller subscription for that seller and plan.
  const subscriptionStart = now.toISOString();
  const nextBilling = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();

  const subscriptionCreateBody = {
    seller_id: sellerId,
    seller_subscription_plan_id: plan.id,
    status: "active",
    started_at: subscriptionStart,
    ended_at: null,
    next_billing_at: nextBilling,
    currency: plan.currency as string & tags.MinLength<1>,
    price_amount: plan.price_amount,
    discount_amount: 0,
    metadata_json: null,
  } satisfies IShoppingMallSellerSubscription.ICreate;

  const subscription: IShoppingMallSellerSubscription =
    await api.functional.shoppingMall.admin.sellerSubscriptions.create(
      connection,
      {
        body: subscriptionCreateBody,
      },
    );
  typia.assert(subscription);

  // 5. Admin creates a seller earning for the seller to give context.
  //    We will synthesize order-related identifiers since no order creation API exists here.
  const syntheticOrderId = typia.random<string & tags.Format<"uuid">>();
  const syntheticPaymentId = typia.random<string & tags.Format<"uuid">>();

  const earningCreateBody = {
    shopping_mall_order_id: syntheticOrderId,
    shopping_mall_order_item_id: null,
    shopping_mall_order_payment_id: syntheticPaymentId,
    currency_code: "USD" as string & tags.MinLength<1> & tags.MaxLength<3>,
    gross_amount: 100,
    seller_discount_amount: 10,
    platform_discount_amount: 5,
    commission_amount: 15,
    other_fee_amount: 0,
    net_earning_amount: 70,
    earning_type: "order_item" as string & tags.MinLength<1>,
    business_status: "eligible" as string & tags.MinLength<1>,
    eligible_at: now.toISOString(),
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
  typia.assert(earning);

  // 6. Admin creates a seller fee charge for that seller.
  const initialEffectiveDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 2,
  ).toISOString();

  const initialFeeChargeBody = {
    sellerId,
    orderId: earning.shopping_mall_order_id,
    paymentRefundId: null,
    sellerPayoutItemId: null,
    feeType: "adjustment",
    description: "Initial generic adjustment fee",
    currency: earning.currency_code,
    amount: 10,
    taxAmount: 1,
    isPlatformRevenue: true,
    effectiveDate: initialEffectiveDate,
  } satisfies IShoppingMallSellerFeeCharge.ICreate;

  const initialFeeCharge: IShoppingMallSellerFeeCharge =
    await api.functional.shoppingMall.admin.sellerFeeCharges.create(
      connection,
      {
        body: initialFeeChargeBody,
      },
    );
  typia.assert(initialFeeCharge);

  // Capture original immutable fields for comparison.
  const originalId = initialFeeCharge.id;
  const originalSellerId = initialFeeCharge.seller.id;
  const originalOrderId = initialFeeCharge.orderId ?? null;
  const originalAmount = initialFeeCharge.amount;
  const originalTaxAmount = initialFeeCharge.taxAmount;
  const originalCurrency = initialFeeCharge.currency;
  const originalIsPlatformRevenue = initialFeeCharge.isPlatformRevenue;

  // 7. Admin updates the seller fee charge classification and description.
  const updatedEffectiveDate = new Date(
    now.getTime() - 1000 * 60 * 60 * 1,
  ).toISOString();

  const updateBody = {
    feeType: "subscription_fee",
    description: `Subscription fee for plan ${plan.code} / ref ${RandomGenerator.alphaNumeric(6)}`,
    effectiveDate: updatedEffectiveDate,
  } satisfies IShoppingMallSellerFeeCharge.IUpdate;

  const updatedFeeCharge: IShoppingMallSellerFeeCharge =
    await api.functional.shoppingMall.admin.sellerFeeCharges.update(
      connection,
      {
        feeChargeId: initialFeeCharge.id,
        body: updateBody,
      },
    );
  typia.assert(updatedFeeCharge);

  // 8. Assertions: updated fields changed, others preserved.
  // Core identity preserved.
  TestValidator.equals(
    "fee charge id remains unchanged",
    updatedFeeCharge.id,
    originalId,
  );

  TestValidator.equals(
    "seller linkage remains unchanged",
    updatedFeeCharge.seller.id,
    originalSellerId,
  );

  TestValidator.equals(
    "order linkage remains unchanged",
    updatedFeeCharge.orderId ?? null,
    originalOrderId,
  );

  // Classification and description updated.
  TestValidator.equals(
    "feeType updated to subscription_fee",
    updatedFeeCharge.feeType,
    updateBody.feeType,
  );

  TestValidator.equals(
    "description updated to the new value",
    updatedFeeCharge.description ?? null,
    updateBody.description ?? null,
  );

  TestValidator.equals(
    "effectiveDate updated to the new accounting period",
    updatedFeeCharge.effectiveDate,
    updateBody.effectiveDate!,
  );

  // Monetary and revenue flags preserved.
  TestValidator.equals(
    "amount remains unchanged after classification update",
    updatedFeeCharge.amount,
    originalAmount,
  );

  TestValidator.equals(
    "taxAmount remains unchanged after classification update",
    updatedFeeCharge.taxAmount,
    originalTaxAmount,
  );

  TestValidator.equals(
    "currency remains unchanged after classification update",
    updatedFeeCharge.currency,
    originalCurrency,
  );

  TestValidator.equals(
    "isPlatformRevenue remains consistent after classification update",
    updatedFeeCharge.isPlatformRevenue,
    originalIsPlatformRevenue,
  );
}
