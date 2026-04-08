import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_shipment } from "../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Generate a random ecommerce mall shipment via the API for E2E testing.
 *
 * Creates a new shipment containing specified order items with shipping carrier and tracking information.
 * The seller must own the products in the order items, and all items must have "paid" status.
 *
 * @param connection - API connection configuration
 * @param props.body - Optional DeepPartial shipment creation data to override defaults
 * @param props.params.itemId - Primary order item ID being shipped (required)
 * @returns The created shipment entity with tracking information and bundled order items
 */
export async function generate_random_ecommerce_mall_seller_sellers_me_orders_items_ship_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallShipment.ICreate>;
    params: {
      itemId: string;
    };
  },
): Promise<IEcommerceMallShipment> {
  const prepared: IEcommerceMallShipment.ICreate =
    prepare_random_ecommerce_mall_shipment(props.body);
  const result: IEcommerceMallShipment =
    await api.functional.ecommerceMall.seller.sellers.me.orders.items.ship.create(
      connection,
      {
        itemId: props.params.itemId,
        body: prepared,
      },
    );
  return result;
}
