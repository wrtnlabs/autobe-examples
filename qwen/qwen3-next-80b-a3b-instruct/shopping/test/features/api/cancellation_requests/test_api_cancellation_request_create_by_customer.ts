import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_shopping_mall_customer_cancellation_requests_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_create_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorizedCustomer);
  // 2. Create a product and order item with status 'paid'
  // For this test, we need to simulate a paid order item
  // We'll create a product via admin, then create an order via customer
  const adminConnection: api.IConnection = { host: connection.host };
  // We need to authorize admin (assuming admin exists)
  // Since we can't control other APIs directly, we'll use customer to create order
  // Create a product: we'll use a dummy product since we can't directly create products
  // We'll rely on the fact that the system has a product available for order
  // Instead, we'll create an order through the checkout flow (simulated)
  // Since we don't have a direct way to create an order item, we'll rely on the fact
  // that the system has at least one product with available stock
  // and the customer has a cart item that can be checked out
  // This is a simulation: we'll assume a cart item exists
  // We'll use the generate_random_shopping_mall_customer_cancellation_requests_create utility function which internally performs the necessary setup
  // We need to create a cancellation request for an order item with status 'paid'
  // The utility function will handle creating the order and setting status to 'paid'
  // We'll use the utility function for cancellation request creation
  // 3. Generate cancellation request using the provided utility
  const cancellationRequest =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // 4. Validate cancellation request properties
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reason length is between 10-500",
    cancellationRequest.reason.length >= 10 &&
      cancellationRequest.reason.length <= 500,
    true,
  );
  TestValidator.equals(
    "customer_id matches",
    cancellationRequest.customer_id,
    authorizedCustomer.id,
  );
  TestValidator.notEquals(
    "order_item_id is not null",
    cancellationRequest.order_item_id,
    null,
  );
  // 5. Validate that creating the same request again fails (duplicate)
  await TestValidator.error(
    "duplicate cancellation request should fail",
    async () => {
      await generate_random_shopping_mall_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            reason: cancellationRequest.reason, // same reason
          },
        },
      );
    },
  );
  // 6. Validate that changing the reason and trying again works
  const newReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const cancellationRequest2 =
    await generate_random_shopping_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          reason: newReason,
        },
      },
    );
  typia.assert(cancellationRequest2);
  // 7. Validate that cancellation request 2 has different order_item_id and reason
  TestValidator.notEquals(
    "different order item",
    cancellationRequest.order_item_id,
    cancellationRequest2.order_item_id,
  );
  TestValidator.notEquals(
    "different reason",
    cancellationRequest.reason,
    cancellationRequest2.reason,
  );
}
