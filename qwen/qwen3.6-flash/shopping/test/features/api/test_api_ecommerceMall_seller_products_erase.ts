import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_products_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.ecommerceMall.seller.products.erase(
    connection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
