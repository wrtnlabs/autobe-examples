import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import typia from "typia";

export async function test_api_ecommerceMall_seller_inventory_records_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallInventoryRecord =
    await api.functional.ecommerceMall.seller.inventory_records.create(
      connection,
      {
        body: typia.random<IEcommerceMallInventoryRecord.ICreate>(),
      },
    );
  typia.assert(output);
}
