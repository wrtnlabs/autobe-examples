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
 * Creates a refund request with a randomized reason text for an order item. The refund request is created for the specified order and item IDs, simulating a customer requesting a refund for a delivered product.
 *
 * This function uses the prepare function to generate realistic test data, then calls the API to create the actual refund request resource. The generated refund request will have 'pending' status and await seller approval or rejection.
 */
export async function generate_random_shopping_mall_customer_orders_items_refund_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallRefundRequest.ICreate> | undefined;
    params: {
      orderId: string;
      itemId: string;
    };
  },
): Promise<IShoppingMallRefundRequest> {
  const prepared: IShoppingMallRefundRequest.ICreate =
    prepare_random_shopping_mall_refund_request(props.body);
  return await api.functional.shoppingMall.customer.orders.items.refund.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
      itemId: props.params.itemId,
    },
  );
}
