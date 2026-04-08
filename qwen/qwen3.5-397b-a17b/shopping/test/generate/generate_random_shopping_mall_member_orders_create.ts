import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_order } from "../prepare/prepare_random_shopping_mall_order";

/**
 * Generate a random shopping mall order via the API for E2E testing.
 *
 * Prepares random order creation data using the prepare function, then calls the order
 * creation endpoint. The order items are automatically derived from the customer's active
 * shopping cart, so the request only needs to specify the shipping address reference.
 *
 * This function is used in test scenarios to create orders for testing order management,
 * shipment tracking, cancellation, refund, and review workflows. The returned order
 * includes all order items with their initial 'paid' status.
 *
 * @param connection The API connection for making HTTP requests
 * @param props Optional properties for customizing the order creation data
 * @param props.body Optional partial order creation data for test-time customization
 * @returns The complete IShoppingMallOrder object including all order items
 */
export async function generate_random_shopping_mall_member_orders_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrder.ICreate>;
  },
): Promise<IShoppingMallOrder> {
  const prepared: IShoppingMallOrder.ICreate =
    prepare_random_shopping_mall_order(props.body);
  const result: IShoppingMallOrder =
    await api.functional.shoppingMall.member.orders.create(connection, {
      body: prepared,
    });
  return result;
}
