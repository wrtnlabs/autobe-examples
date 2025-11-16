import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that platformAdmin cannot create a payment transaction for a
 * non-existent order.
 *
 * Business intent:
 *
 * - A payment transaction must always be tied to an existing, eligible order.
 * - Even when a valid payment method and syntactically valid payload are
 *   supplied, using an unknown orderId must be rejected as a business error.
 *
 * High-level flow:
 *
 * 1. Register and authenticate a platform administrator via POST
 *    /auth/platformAdmin/join.
 * 2. As that platformAdmin, create a valid payment method configuration via POST
 *    /shoppingMall/platformAdmin/paymentMethods.
 * 3. Generate a random UUID that does not correspond to any created order.
 * 4. Attempt to create a payment transaction using the random orderId and the
 *    valid paymentMethodId via POST
 *    /shoppingMall/platformAdmin/paymentTransactions.
 * 5. Verify that the create call fails with a business error (any error), ensuring
 *    the system does not accept a transaction for a non-existent order.
 */
export async function test_api_platform_admin_payment_transaction_creation_invalid_order(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a valid payment method configuration
  const paymentMethodBody = {
    code: `card_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_key: "primary_gateway",
    method_type: "card",
    currency_restriction: "KRW",
    min_amount: 1000,
    max_amount: 1000000,
    priority: 1,
    is_active: true,
    starts_at: new Date().toISOString(),
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

  // 3. Generate a random UUID that should not correspond to any existing order
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();

  // 4. Build a syntactically valid payment transaction create payload
  const txBody = {
    orderId: nonExistentOrderId,
    paymentMethodId: paymentMethod.id,
    paymentIntentKey: RandomGenerator.alphaNumeric(16),
    providerName: "test_gateway",
    providerTransactionId: RandomGenerator.alphaNumeric(24),
    currency: "KRW" as string & tags.MinLength<3> & tags.MaxLength<3>,
    authorizedAmount: 10000,
    capturedAmount: null,
    paymentStatus: "payment_pending",
    providerStatus: "initialized",
    failureReasonCode: null,
    failureReasonMessage: null,
    requiresManualReview: false,
    metadataJson: "{}",
  } satisfies IShoppingMallPaymentTransaction.ICreate;

  // 5. Assert that creating a transaction for a non-existent order fails
  await TestValidator.error(
    "creating payment transaction for non-existent order must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        {
          body: txBody,
        },
      );
    },
  );
}
