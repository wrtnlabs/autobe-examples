import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallPaymentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMetadata";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";
import { generate_random_shopping_mall_payments_create } from "../../../generate/generate_random_shopping_mall_payments_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create payment record with pending status using admin connection
  const payment: IShoppingMallPayment =
    await generate_random_shopping_mall_payments_create(adminConnection, {
      body: {
        order_id: typia.random<string & tags.Format<"uuid">>(),
        payment_method_id: typia.random<string & tags.Format<"uuid">>(),
        amount: typia.random<number & tags.Minimum<0.01>>(),
        currency: "KRW",
      } satisfies IShoppingMallPayment.ICreate,
    });
  typia.assert(payment);
  TestValidator.equals(
    "payment status should be pending",
    payment.status,
    "pending",
  );
  // Step 3: Update payment status to succeeded using admin connection
  const updatedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.update(adminConnection, {
      paymentId: payment.id,
      body: {
        status: "succeeded",
        // Preserve original amount, currency, order_id, and payment_method_id
        amount: payment.amount,
        currency: payment.currency,
        payment_method_id: payment.payment_method_id,
        // Omit metadata to preserve undefined state (not included in initial payment)
        // Omit gateway-related fields to preserve undefined state
      } satisfies IShoppingMallPayment.IUpdate,
    });
  typia.assert(updatedPayment);
  // Step 4: Validate the successful update
  TestValidator.equals(
    "payment ID should remain unchanged",
    updatedPayment.id,
    payment.id,
  );
  TestValidator.equals(
    "order_id should be preserved",
    updatedPayment.order_id,
    payment.order_id,
  );
  TestValidator.equals(
    "payment_method_id should be preserved",
    updatedPayment.payment_method_id,
    payment.payment_method_id,
  );
  TestValidator.equals(
    "amount should be preserved",
    updatedPayment.amount,
    payment.amount,
  );
  TestValidator.equals(
    "currency should be preserved",
    updatedPayment.currency,
    payment.currency,
  );
  TestValidator.equals(
    "status should be updated to succeeded",
    updatedPayment.status,
    "succeeded",
  );
  TestValidator.equals(
    "gateway_transaction_id should be undefined",
    updatedPayment.gateway_transaction_id,
    payment.gateway_transaction_id,
  );
  TestValidator.equals(
    "gateway_payment_response should be undefined",
    updatedPayment.gateway_payment_response,
    payment.gateway_payment_response,
  );
  TestValidator.equals(
    "gateway_payment_reason should be undefined",
    updatedPayment.gateway_payment_reason,
    payment.gateway_payment_reason,
  );
  // Step 5: Verify idempotency - repeat the same update
  const idempotentUpdate: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.payments.update(adminConnection, {
      paymentId: payment.id,
      body: {
        status: "succeeded",
        amount: payment.amount,
        currency: payment.currency,
        payment_method_id: payment.payment_method_id,
        // Omit metadata and gateway-related fields to preserve undefined state
      } satisfies IShoppingMallPayment.IUpdate,
    });
  typia.assert(idempotentUpdate);
  // Step 6: Verify idempotent update returns same data
  TestValidator.equals(
    "idempotent update ID matches",
    idempotentUpdate.id,
    payment.id,
  );
  TestValidator.equals(
    "idempotent update status matches",
    idempotentUpdate.status,
    "succeeded",
  );
  TestValidator.equals(
    "idempotent update amount matches",
    idempotentUpdate.amount,
    payment.amount,
  );
  TestValidator.equals(
    "idempotent update order_id matches",
    idempotentUpdate.order_id,
    payment.order_id,
  );
  TestValidator.equals(
    "idempotent update payment_method_id matches",
    idempotentUpdate.payment_method_id,
    payment.payment_method_id,
  );
  TestValidator.equals(
    "idempotent update currency matches",
    idempotentUpdate.currency,
    payment.currency,
  );
  // Ensure gateway-related fields remain unchanged after idempotent update
  TestValidator.equals(
    "idempotent gateway_transaction_id unchanged",
    idempotentUpdate.gateway_transaction_id,
    payment.gateway_transaction_id,
  );
  TestValidator.equals(
    "idempotent gateway_payment_response unchanged",
    idempotentUpdate.gateway_payment_response,
    payment.gateway_payment_response,
  );
  TestValidator.equals(
    "idempotent gateway_payment_reason unchanged",
    idempotentUpdate.gateway_payment_reason,
    payment.gateway_payment_reason,
  );
}
