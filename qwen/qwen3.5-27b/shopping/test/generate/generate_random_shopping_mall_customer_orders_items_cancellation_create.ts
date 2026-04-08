import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_cancellation_request } from "../prepare/prepare_random_shopping_mall_cancellation_request";

/**
 * Generate a random cancellation request for an order item via the API for E2E testing.
 *
 * Prepares random cancellation request data using the prepare function, then calls the creation endpoint. The cancellation request includes a customer's reason for requesting cancellation of a specific order item. The order item must be in 'paid' status (not yet shipped) for the cancellation to be allowed.
 *
 * This function requires orderId and itemId URL path parameters to specify which order item to cancel. The reason field is automatically generated with meaningful content (minimum 10 characters) to ensure valid cancellation requests.
 */
export async function generate_random_shopping_mall_customer_orders_items_cancellation_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCancellationRequest.ICreate> | undefined;
    params: {
      orderId: string;
      itemId: string;
    };
  },
): Promise<IShoppingMallCancellationRequest> {
  const prepared: IShoppingMallCancellationRequest.ICreate =
    prepare_random_shopping_mall_cancellation_request(props.body);
  return await api.functional.shoppingMall.customer.orders.items.cancellation.create(
    connection,
    {
      body: prepared,
      orderId: props.params.orderId,
      itemId: props.params.itemId,
    },
  );
}
