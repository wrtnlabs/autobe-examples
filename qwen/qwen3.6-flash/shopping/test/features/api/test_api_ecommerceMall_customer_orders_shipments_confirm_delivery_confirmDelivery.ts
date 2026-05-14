import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_orders_shipments_confirm_delivery_confirmDelivery(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
}
