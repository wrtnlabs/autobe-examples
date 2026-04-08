import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_refund_request } from "../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Generate a random refund request for a delivered order item for E2E testing.
 *
 * Creates a refund request for a specific order item that has been delivered.
 * The refund request includes a customer's reason for requesting the refund and
 * is created within the seven-day window from delivery. The request status is
 * initially set to 'pending' awaiting seller approval or rejection.
 *
 * This function requires the orderId and itemId as URL path parameters to
 * identify which order item to request a refund for. The system validates that
 * the order item has 'delivered' status and that the request is within the
 * seven-day window from the delivery date.
 */
export async function generate_random_shopping_mall_customer_customers_me_orders_items_refund_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallRefundRequest.ICreate>;
    params: {
      orderId: string;
      itemId: string;
    };
  },
): Promise<IShoppingMallRefundRequest> {
  const prepared: IShoppingMallRefundRequest.ICreate =
    prepare_random_shopping_mall_refund_request(props.body);
  return await api.functional.shoppingMall.customer.customers.me.orders.items.refund.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
      itemId: props.params.itemId,
    },
  );
}
