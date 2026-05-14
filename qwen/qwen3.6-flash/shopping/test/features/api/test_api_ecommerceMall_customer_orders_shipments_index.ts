import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_customer_orders_shipments_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallShipment.IRequest>(),
      },
    );
  typia.assert(output);
}
