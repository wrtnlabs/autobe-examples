import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import typia from "typia";

export async function test_api_ecommerceMall_seller_shipments_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShipment =
    await api.functional.ecommerceMall.seller.shipments.create(connection, {
      body: typia.random<IEcommerceMallShipment.ICreate>(),
    });
  typia.assert(output);
}
