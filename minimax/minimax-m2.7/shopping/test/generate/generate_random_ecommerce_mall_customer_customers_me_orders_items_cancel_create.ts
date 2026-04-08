import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_cancellation_request } from "../prepare/prepare_random_ecommerce_mall_cancellation_request";

/**
 * Generate a random cancellation request for an order item via the API for E2E testing.
 *
 * Creates a cancellation request for a specific order item that has 'paid' status. The customer must own
 * the order containing the item. The request enters 'pending' status and requires seller approval.
 *
 * @param connection - API connection instance
 * @param props.body - Optional DeepPartial input to override specific cancellation request properties
 * @param props.params.itemId - Unique identifier of the order item to cancel (must have 'paid' status)
 * @returns The created cancellation request with 'pending' status
 */
export async function generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCancellationRequest.ICreate>;
    params: {
      itemId: string;
    };
  },
): Promise<IEcommerceMallCancellationRequest> {
  const prepared: IEcommerceMallCancellationRequest.ICreate =
    prepare_random_ecommerce_mall_cancellation_request(props.body);
  const result: IEcommerceMallCancellationRequest =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.cancel.create(
      connection,
      {
        itemId: props.params.itemId,
        body: prepared,
      },
    );
  return result;
}
