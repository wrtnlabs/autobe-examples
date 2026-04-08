import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_refund_request } from "../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Generate a random refund request for an order item via the API for E2E testing.
 *
 * Prepares random refund request data using the prepare function, then calls the creation endpoint
 * to submit a refund request for the specified order item. The refund request initiates a seller
 * approval workflow where the seller must approve or reject the refund.
 *
 * @param connection - API connection configuration
 * @param props - Generation properties containing optional body override and required URL parameters
 * @param props.body - Optional DeepPartial override for refund request data
 * @param props.params - Required URL parameters with orderId and itemId
 * @returns The created refund request with full details
 */
export async function generate_random_ecommerce_mall_member_customer_orders_items_refund_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallRefundRequest.ICreate> | undefined;
    params: {
      orderId: string;
      itemId: string;
    };
  },
): Promise<IEcommerceMallRefundRequest> {
  const prepared: IEcommerceMallRefundRequest.ICreate =
    prepare_random_ecommerce_mall_refund_request(props.body);
  return await api.functional.ecommerceMall.member.customer.orders.items.refund.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
      itemId: props.params.itemId,
    },
  );
}
