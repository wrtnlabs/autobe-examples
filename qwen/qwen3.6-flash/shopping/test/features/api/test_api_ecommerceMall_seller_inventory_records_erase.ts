import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_inventory_records_erase(
  connection: api.IConnection,
) {
  const output =
    await api.functional.ecommerceMall.seller.inventory_records.erase(
      connection,
      {
        recordId: typia.random<number & tags.Type<"int32">>(),
      },
    );
  typia.assert(output);
}
