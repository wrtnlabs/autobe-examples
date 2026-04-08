import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { prepare_random_ecommerce_mall_shipment } from "../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Generate a random shipment for seller order items via the API for E2E testing.
 *
 * Prepares random shipment data using the prepare function, then calls the shipment
 * creation endpoint. This function is used by sellers to create shipments for their
 * order items. All order items must have "paid" status and belong to the same seller.
 *
 * The shipment includes carrier information and tracking number for customer delivery
 * tracking. When a shipment is created, all included order items automatically
 * transition from "paid" to "shipped" status.
 *
 * @param connection API connection configured with seller authentication
 * @param props Optional DeepPartial overrides for shipment creation data
 * @returns The created shipment including ID, carrier, tracking number, and shipment items
 */
export async function generate_random_ecommerce_mall_seller_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallShipment.ICreate>;
  }
): Promise<IEcommerceMallShipment> {
  const prepared: IEcommerceMallShipment.ICreate = prepare_random_ecommerce_mall_shipment(props.body);
  const result: IEcommerceMallShipment = await api.functional.ecommerceMall.seller.shipments.create(
    connection,
    {
      body: prepared,
    }
  );
  return result;
}