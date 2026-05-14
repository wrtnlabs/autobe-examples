import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_shipments_items_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShipmentItem =
    await api.functional.ecommerceMall.seller.shipments.items.at(connection, {
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
      shipmentItemId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
