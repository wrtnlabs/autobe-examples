import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_shipments_items_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShipmentItem =
    await api.functional.ecommerceMall.seller.shipments.items.update(
      connection,
      {
        shipmentId: typia.random<string & tags.Format<"uuid">>(),
        shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallShipmentItem.IUpdate>(),
      },
    );
  typia.assert(output);
}
