import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_inventory_records_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallInventoryRecord =
    await api.functional.ecommerceMall.seller.inventory_records.update(
      connection,
      {
        recordId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallInventoryRecord.IUpdate>(),
      },
    );
  typia.assert(output);
}
