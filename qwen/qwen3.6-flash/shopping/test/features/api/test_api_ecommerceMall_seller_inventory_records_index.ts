import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IPageIEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallInventoryRecord";
import typia from "typia";

export async function test_api_ecommerceMall_seller_inventory_records_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallInventoryRecord.ISummary =
    await api.functional.ecommerceMall.seller.inventory_records.index(
      connection,
      {
        body: typia.random<IEcommerceMallInventoryRecord.IRequest>(),
      },
    );
  typia.assert(output);
}
