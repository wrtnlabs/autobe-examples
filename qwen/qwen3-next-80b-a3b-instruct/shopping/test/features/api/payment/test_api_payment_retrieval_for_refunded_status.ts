import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
export async function test_api_payment_retrieval_for_refunded_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a realistic 'refunded' payment record using typia.random
  const refundedPayment: IShoppingMallPayment =
    typia.random<IShoppingMallPayment>();
  // Step 2: Ensure the generated payment has 'refunded' status for the test scenario
  const paymentId: string = refundedPayment.id;
  refundedPayment.status = "refunded" as const;
  // Step 3: Retrieve the payment record by paymentId
  const retrievedPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.payments.at(connection, {
      paymentId,
    });
  // Step 4: Validate the retrieval result matches the schema
  typia.assert(retrievedPayment);
  // Step 5: Verify the payment retrieved has 'refunded' status for audit trail completeness
  TestValidator.equals(
    "payment status should be refunded",
    retrievedPayment.status,
    "refunded",
  );
  // Step 6: Verify the payment ID matches the original ID
  TestValidator.equals(
    "retrieved payment ID should match requested ID",
    retrievedPayment.id,
    paymentId,
  );
  // Step 7: Verify key properties are preserved in retrieval
  TestValidator.equals(
    "payment amount should be preserved",
    retrievedPayment.amount,
    refundedPayment.amount,
  );
  TestValidator.equals(
    "payment currency should be preserved",
    retrievedPayment.currency,
    refundedPayment.currency,
  );
  TestValidator.equals(
    "payment order ID should be preserved",
    retrievedPayment.order_id,
    refundedPayment.order_id,
  );
  TestValidator.equals(
    "payment method ID should be preserved",
    retrievedPayment.payment_method_id,
    refundedPayment.payment_method_id,
  );
  TestValidator.equals(
    "payment created_at should be preserved",
    retrievedPayment.created_at,
    refundedPayment.created_at,
  );
}
