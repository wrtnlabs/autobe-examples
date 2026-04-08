import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IConnection } from "@nestia/fetcher";

import { prepare_random_ecommerce_mall_shipment } from "../prepare/prepare_random_ecommerce_mall_shipment";

export async function generate_random_ecommerce_mall_seller_orders_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallShipment.ICreate>;
    params: {
      orderId: string;
    };
  },
): Promise<IEcommerceMallShipment> {
  const prepared: IEcommerceMallShipment.ICreate = prepare_random_ecommerce_mall_shipment(
    props.body,
  );
  const result: IEcommerceMallShipment = await api.functional.ecommerceMall.seller.orders.shipments.create(
    connection,
    {
      orderId: props.params.orderId,
      body: prepared,
    },
  );
  return result;
}