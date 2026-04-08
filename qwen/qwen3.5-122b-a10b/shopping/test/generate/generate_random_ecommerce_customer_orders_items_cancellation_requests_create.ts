import api from "@ORGANIZATION/PROJECT-api";
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

import { prepare_random_ecommerce_cancellation_request } from "../prepare/prepare_random_ecommerce_cancellation_request";

/**
 * Generate a random cancellation request for an order item via the API for E2E testing.
 *
 * Creates a cancellation request for a paid order item that has not yet been shipped.
 * The request includes a reason explaining why the customer wants to cancel, and the
 * seller can then approve or reject it. Upon approval, stock quantities are automatically
 * restored and the customer receives a refund.
 *
 * This function prepares random cancellation request data using the prepare function,
 * then calls the creation endpoint with the specified order and item IDs.
 *
 * @param connection - Connection information for the API server
 * @param props.body - Optional partial cancellation request data to customize
 * @param props.params.orderId - UUID of the order containing the item to cancel
 * @param props.params.itemId - UUID of the order item to cancel
 * @returns The created cancellation request with status "pending"
 *
 * @example
 *   ```typescript
 *   const cancellationRequest = await generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
 *     connection,
 *     {
 *       body: { reason: "Changed my mind" },
 *       params: { orderId: "uuid", itemId: "uuid" }
 *     }
 *   );
 *   ```
 */
export async function generate_random_ecommerce_customer_orders_items_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCancellationRequest.ICreate>;
    params: {
      orderId: string;
      itemId: string;
    };
  },
): Promise<IEcommerceCancellationRequest> {
  const prepared: IEcommerceCancellationRequest.ICreate =
    prepare_random_ecommerce_cancellation_request(props.body);
  const result: IEcommerceCancellationRequest =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.create(
      connection,
      {
        orderId: props.params.orderId,
        itemId: props.params.itemId,
        body: prepared,
      },
    );
  return result;
}
