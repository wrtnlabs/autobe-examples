import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallPaymentAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuthorization";
import type { IShoppingMallPaymentCapture } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCapture";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_get_payment_capture_not_found_for_mismatched_ids(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and becomes authenticated
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a payment method as platform admin
  const paymentMethodBody = {
    code: `pm_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Test Card",
    description: "Test payment method for E2E",
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodBody,
      },
    );
  typia.assert(paymentMethod);

  // 3. Prepare synthetic order and customer IDs (focus is payment scoping, not full order lifecycle)
  const syntheticOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const syntheticCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const currency = "USD";
  const authorizedAmount = 10_00; // represent $10.00 in smallest unit

  // 4. Create first payment transaction T1
  const paymentTransactionBody1 = {
    orderId: syntheticOrderId,
    customerId: syntheticCustomerId,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent_${RandomGenerator.alphaNumeric(10)}`,
    providerName: "test-gateway",
    providerTransactionId: `txn_${RandomGenerator.alphaNumeric(10)}`,
    currency,
    authorizedAmount,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const t1: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionBody1,
      },
    );
  typia.assert(t1);

  // 5. Create second payment transaction T2 for the same synthetic order
  const paymentTransactionBody2 = {
    orderId: syntheticOrderId,
    customerId: syntheticCustomerId,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: `intent_${RandomGenerator.alphaNumeric(10)}`,
    providerName: "test-gateway",
    providerTransactionId: `txn_${RandomGenerator.alphaNumeric(10)}`,
    currency,
    authorizedAmount,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: null,
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: null,
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  const t2: IShoppingMallPaymentTransaction =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
      connection,
      {
        body: paymentTransactionBody2,
      },
    );
  typia.assert(t2);

  // 6. Create an authorization under T1
  const authorizationBody = {
    amount: authorizedAmount,
    currency,
    gateway_code: "test-gateway",
    gateway_authorization_id: `auth_${RandomGenerator.alphaNumeric(10)}`,
    channel: "test",
    risk_metadata: {},
  } satisfies IShoppingMallPaymentAuthorization.ICreate;

  const authorization: IShoppingMallPaymentAuthorization =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.authorizations.create(
      connection,
      {
        paymentTransactionId: t1.id,
        body: authorizationBody,
      },
    );
  typia.assert(authorization);

  // 7. Create a capture C1 under T1
  const captureBody = {
    shopping_mall_payment_authorization_id: authorization.id,
    provider_capture_id: `cap_${RandomGenerator.alphaNumeric(10)}`,
    amount: authorizedAmount,
    currency,
    capture_status: "capture_pending",
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallPaymentCapture.ICreate;

  const c1: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.create(
      connection,
      {
        paymentTransactionId: t1.id,
        body: captureBody,
      },
    );
  typia.assert(c1);

  // 8. Negative case: attempt to fetch the capture using mismatched transaction ID (T2)
  await TestValidator.error(
    "capture lookup must fail when captureId does not belong to paymentTransactionId",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.at(
        connection,
        {
          paymentTransactionId: t2.id,
          captureId: c1.id,
        },
      );
    },
  );

  // 9. Positive case: fetch the capture with the correct transaction ID (T1)
  const fetched: IShoppingMallPaymentCapture =
    await api.functional.shoppingMall.platformAdmin.paymentTransactions.captures.at(
      connection,
      {
        paymentTransactionId: t1.id,
        captureId: c1.id,
      },
    );
  typia.assert(fetched);

  TestValidator.equals(
    "fetched capture id should match original capture id",
    fetched.id,
    c1.id,
  );

  TestValidator.equals(
    "fetched capture's payment transaction should be T1",
    fetched.paymentTransaction.id,
    t1.id,
  );
}
