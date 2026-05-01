import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_cancellation_request } from "../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Generate a random cancellation request for an order item via the API for E2E testing.
 *
 * Prepares random cancellation request data using the prepare function, then calls the
 * creation endpoint to submit a cancellation request for the specified order item. The
 * request is created with "pending" status and awaits seller review.
 *
 * The order item must be in "paid" status for cancellation to succeed. The itemId
 * parameter identifies which order item the cancellation targets. The customer-provided
 * reason text is preserved in cancellation request snapshots created when the seller
 * responds, forming part of the permanent audit trail.
 *
 * @param connection API connection information for the authenticated customer session
 * @param props Configuration for the cancellation request generation
 * @param props.body Optional partial cancellation request data to customize or override
 *   random defaults. The reason field can be specified to provide a specific cancellation
 *   explanation.
 * @param props.params URL path parameters containing the target order item ID
 * @param props.params.itemId UUID of the order item to request cancellation for
 * @returns The newly created cancellation request with "pending" status, including its
 *   ID, associated order item reference, the customer-provided reason, and creation
 *   timestamp.
 */
export async function generate_random_shopping_mall_customer_order_items_cancellation_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCancellationRequest.ICreate>;
    params: {
      itemId: string;
    };
  },
): Promise<IShoppingMallCancellationRequest> {
  const prepared: IShoppingMallCancellationRequest.ICreate =
    prepare_random_shopping_mall_cancellation_request(props.body);
  const result: IShoppingMallCancellationRequest =
    await api.functional.shoppingMall.customer.order_items.cancellation_requests.create(
      connection,
      {
        body: prepared,
        itemId: props.params.itemId,
      },
    );
  return result;
}
