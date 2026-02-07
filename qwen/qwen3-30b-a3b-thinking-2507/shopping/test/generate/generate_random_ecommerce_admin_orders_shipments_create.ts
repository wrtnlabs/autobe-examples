import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_shipment } from "../prepare/prepare_random_ecommerce_shipment";

export async function generate_random_ecommerce_admin_orders_shipments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceShipment.ICreate> | undefined;
    params?: {
      orderId: string;
    };
  },
): Promise<IEcommerceShipment> {
  const prepared: IEcommerceShipment.ICreate =
    prepare_random_ecommerce_shipment(props.body);
  const result: IEcommerceShipment =
    await api.functional.ecommerce.admin.orders.shipments.create(connection, {
      orderId: props.params!.orderId,
      body: prepared,
    });
  return result;
}