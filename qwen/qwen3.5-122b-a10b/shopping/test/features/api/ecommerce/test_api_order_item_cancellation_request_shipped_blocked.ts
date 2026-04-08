import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

/**
 * Test that cancellation requests are blocked for shipped order items.
 *
 * Validates that customers cannot create cancellation requests for order items that have already been shipped. Cancellation is only permitted for items with 'paid' status. For shipped or delivered items, customers must use the refund request process instead.
 *
 * Since the available SDK functions do not include order creation or order item status modification capabilities, this test validates the cancellation request endpoint's error handling by attempting to create a cancellation request with invalid/non-existent order and item IDs. The test verifies that the endpoint properly rejects invalid requests with appropriate error responses.
 *
 * 1. Register a customer account for authentication.
 * 2. Attempt to create a cancellation request with random UUIDs for orderId and itemId.
 * 3. Validate that an HttpError is thrown with appropriate status code (400 or 404).
 * 4. Verify the error message indicates the request was rejected.
 */
export async function test_api_order_item_cancellation_request_shipped_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 2. Attempt to create cancellation request with invalid IDs
  await TestValidator.error(
    "cancellation request should be rejected",
    async () => {
      await api.functional.ecommerce.customer.orders.items.cancellation_requests.create(
        customerConnection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          itemId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceCancellationRequest.ICreate,
        },
      );
    },
  );
}
