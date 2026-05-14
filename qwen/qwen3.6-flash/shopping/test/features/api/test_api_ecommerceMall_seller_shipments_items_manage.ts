import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_shipments_items_manage(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.seller.shipments.items.manage(
      connection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallShipment.IAssignRequest>(),
      },
    );
  typia.assert(output);
}
