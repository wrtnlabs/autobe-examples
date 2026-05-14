import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_inventory_records_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallInventoryRecord =
    await api.functional.ecommerceMall.seller.inventory_records.at(connection, {
      recordId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
