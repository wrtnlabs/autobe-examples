import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_shipments_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.ecommerceMall.seller.shipments.erase(
    connection,
    {
      shipmentId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
