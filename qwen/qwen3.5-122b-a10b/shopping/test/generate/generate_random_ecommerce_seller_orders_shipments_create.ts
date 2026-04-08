import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_shipment } from "../prepare/prepare_random_ecommerce_shipment";

/**
 * Generate a random ecommerce shipment via the API for E2E testing.
 *
 * Prepares random shipment data using the prepare function, then calls the shipment creation endpoint.
 * Creates a shipment for order items belonging to a specific order, allowing sellers to ship one or
 * more order items from their products within an order.
 *
 * @param connection API connection information
 * @param props Generation parameters
 * @param props.body Optional partial shipment creation data to override defaults
 * @param props.params URL parameters including the order ID
 * @param props.params.orderId Unique identifier of the order containing items to be shipped
 * @returns Created shipment record with tracking information and included order items
 */
export async function generate_random_ecommerce_seller_orders_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceShipment.ICreate>;
    params: {
      orderId: string;
    };
  },
): Promise<IEcommerceShipment> {
  const prepared: IEcommerceShipment.ICreate =
    prepare_random_ecommerce_shipment(props.body);
  const result: IEcommerceShipment =
    await api.functional.ecommerce.seller.orders.shipments.create(connection, {
      orderId: props.params.orderId,
      body: prepared,
    });
  return result;
}
