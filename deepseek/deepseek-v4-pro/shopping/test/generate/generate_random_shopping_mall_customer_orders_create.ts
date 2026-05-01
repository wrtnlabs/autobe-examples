import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshot";
import type { IShoppingMallOrderItemProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemProductSnapshotImage";
import type { IShoppingMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSellerSnapshot";
import type { IShoppingMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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
 * Prepares random order creation data using the prepare function, then calls the checkout endpoint to place the order.
 * The order is created atomically with the provided items and shipping address — stock must be available for all
 * requested variants, or the order will be rejected.
 *
 * Each generated order contains 1-3 items with random variant IDs and positive quantities, along with a randomized
 * shipping address including recipient name, phone number, street address, city, state/province, postal code, and
 * country. All values can be overridden via the optional `body` parameter for targeted test scenarios.
 *
 * The returned order includes the system-generated order code, frozen total price, all order items with their "paid"
 * status, and immutable purchase-time snapshots of products, variants, and seller profiles. Shipments will be empty
 * initially and populated later by sellers through the shipping workflow.
 *
 * @param connection API connection with customer authentication context
 * @param props.body Optional partial order creation data to override generated defaults
 * @returns The fully created order with all items, snapshots, and metadata
 */
export async function generate_random_shopping_mall_customer_orders_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallOrder.ICreate> | undefined;
  },
): Promise<IShoppingMallOrder> {
  const prepared: IShoppingMallOrder.ICreate =
    prepare_random_shopping_mall_order(props.body);
  return await api.functional.shoppingMall.customer.orders.create(connection, {
    body: prepared,
  });
}
