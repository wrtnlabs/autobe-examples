import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_refund_request } from "../prepare/prepare_random_ecommerce_refund_request";

/**
 * Generate a random refund request for a delivered order item via the API for E2E testing.
 *
 * Creates a refund request attached to the order item specified by orderId and itemId. The request is submitted with a randomized reason explaining why the customer is requesting the refund.
 *
 * @param connection The API connection object
 * @param props.body Optional partial input to override specific fields in the refund request creation data
 * @param props.params.orderId Unique identifier of the parent order (UUID format)
 * @param props.params.itemId Unique identifier of the order item requesting refund (UUID format)
 * @returns The created refund request with 'pending' status
 */
export async function generate_random_ecommerce_customer_orders_items_refund_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceRefundRequest.ICreate>;
    params: {
      orderId: string;
      itemId: string;
    };
  },
): Promise<IEcommerceRefundRequest> {
  const prepared: IEcommerceRefundRequest.ICreate =
    prepare_random_ecommerce_refund_request(props.body);
  const result: IEcommerceRefundRequest =
    await api.functional.ecommerce.customer.orders.items.refund_requests.create(
      connection,
      {
        orderId: props.params.orderId,
        itemId: props.params.itemId,
        body: prepared,
      },
    );
  return result;
}
