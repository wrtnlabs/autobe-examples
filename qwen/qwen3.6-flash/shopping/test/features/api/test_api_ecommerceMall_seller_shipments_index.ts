import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import typia from "typia";

export async function test_api_ecommerceMall_seller_shipments_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallShipment.ISummary =
    await api.functional.ecommerceMall.seller.shipments.index(connection, {
      body: typia.random<IEcommerceMallShipment.IRequest>(),
    });
  typia.assert(output);
}
