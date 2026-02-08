import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { TestValidator } from "@nestia/e2e";
import typia from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request } from "../../../generate/generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request";
import { generate_random_shopping_mall_order_item_snapshots_create } from "../../../generate/generate_random_shopping_mall_order_item_snapshots_create";

export async function test_api_customer_refund_request_create_concurrent_duplicates(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody: IShoppingMallCustomer.IJoin = typia.random<IShoppingMallCustomer.IJoin>();
  const authCustomer = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  customerConnection.headers = { Authorization: authCustomer.token.access };

  // 2. Create order item snapshot to ensure order item exists
  const orderItemSnapshot =
    await generate_random_shopping_mall_order_item_snapshots_create(customerConnection, {});

  // Access the correct property for orderItemId
  // Since 'id' does not exist, try 'order_item_id' or 'orderItemId'; otherwise throw error
  const orderItemId = (
    "order_item_id" in orderItemSnapshot
      ? (orderItemSnapshot as any).order_item_id
      : "id" in orderItemSnapshot
      ? (orderItemSnapshot as any).id
      : undefined
  );
  if (orderItemId === undefined) {
    throw new Error("orderItemSnapshot does not have an 'id' or 'order_item_id' property");
  }

  // 3. Concurrently attempt multiple refund requests
  const concurrentAttempts = 5;
  const refundRequests = await Promise.all(
    Array.from({ length: concurrentAttempts }).map(() =>
      generate_random_shopping_mall_customer_orders_items_refund_request_create_refund_request(
        customerConnection,
        {
          params: { orderItemId },
          body: {},
        },
      ).then(
        (result) => ({ success: true, result }),
        (error) => ({ success: false, error }),
      ),
    ),
  );

  // 4. Count successes and failures
  const successCount = refundRequests.filter((r) => r.success).length;
  const failureCount = refundRequests.filter((r) => !r.success).length;

  // 5. Confirm only one succeeded
  TestValidator.equals("only one refund request succeeds", successCount, 1);

  // 6. Confirm failures are conflicts 409
  for (const result of refundRequests) {
    if (!result.success) {
      // Narrow to type with error
      const errObj = result as { success: false; error: any };
      if (errObj.error instanceof api.HttpError) {
        TestValidator.equals(
          "conflict error for duplicate refund request",
          errObj.error.status,
          409,
        );
      } else {
        throw new Error(`Unexpected error type: ${errObj.error}`);
      }
    }
  }

  // 7. For success, assert structure
  const successfulRequest = refundRequests.find((r) => r.success) as
    | { success: true; result: IShoppingMallRefundRequest }
    | undefined;
  if (successfulRequest) {
    typia.assert(successfulRequest.result);
  } else {
    throw new Error("No successful refund request found.");
  }
}
