import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_shipments_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShipment =
    await api.functional.ecommerceMall.seller.shipments.at(connection, {
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
