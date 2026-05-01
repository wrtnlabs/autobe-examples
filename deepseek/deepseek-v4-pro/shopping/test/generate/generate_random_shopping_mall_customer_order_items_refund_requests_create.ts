import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_refund_request } from "../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Generate a random refund request for a delivered order item via the API for E2E testing.
 *
 * Prepares random refund request data using the prepare function, then submits the refund
 * request to the API. The request targets an existing delivered order item specified by
 * the `itemId` URL parameter.
 *
 * The generated refund request includes a randomized reason text and is created in
 * `pending` status, ready for seller review. The order item must be in `delivered`
 * status and within the 7-day refund eligibility window. Only one active refund request
 * can exist per order item at a time.
 *
 * @param connection The API connection with customer authentication credentials
 * @param props.body Optional partial refund request data to override the randomized reason
 * @param props.params The URL parameters including the target order item ID
 * @returns The created refund request with pending status, generated ID, and timestamps
 */
export async function generate_random_shopping_mall_customer_order_items_refund_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallRefundRequest.ICreate>;
    params?: {
      itemId: string;
    };
  },
): Promise<IShoppingMallRefundRequest> {
  const prepared: IShoppingMallRefundRequest.ICreate =
    prepare_random_shopping_mall_refund_request(props.body);
  const result: IShoppingMallRefundRequest =
    await api.functional.shoppingMall.customer.order_items.refund_requests.create(
      connection,
      {
        itemId: props.params!.itemId,
        body: prepared,
      },
    );
  return result;
}
