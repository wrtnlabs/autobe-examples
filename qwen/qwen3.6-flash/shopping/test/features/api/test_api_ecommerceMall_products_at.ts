import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_products_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallProduct =
    await api.functional.ecommerceMall.products.at(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
