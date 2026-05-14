import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_shipments_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShipment =
    await api.functional.ecommerceMall.seller.shipments.update(connection, {
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallShipment.IUpdate>(),
    });
  typia.assert(output);
}
