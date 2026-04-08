import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_refund_request } from "../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Generate a random refund request for a delivered order item via the API for E2E testing.
 *
 * Prepares random refund request data using the prepare function, then calls the creation endpoint.
 * The order item must be in 'delivered' status and the refund must be requested within seven days of delivery.
 *
 * @param connection API connection context
 * @param props.body Optional overrides for the refund request data (reason field)
 * @param props.params.itemId The UUID of the delivered order item to request refund for
 * @returns The created refund request with its ID, status, and timestamps
 */
export async function generate_random_ecommerce_mall_customer_customers_me_orders_items_refund_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallRefundRequest.ICreate>;
    params: {
      itemId: string;
    };
  },
): Promise<IEcommerceMallRefundRequest> {
  const prepared: IEcommerceMallRefundRequest.ICreate =
    prepare_random_ecommerce_mall_refund_request(props.body);
  const result: IEcommerceMallRefundRequest =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.refund.create(
      connection,
      {
        itemId: props.params.itemId,
        body: prepared,
      },
    );
  return result;
}
