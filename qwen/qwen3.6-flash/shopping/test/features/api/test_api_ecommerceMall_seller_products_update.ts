import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_seller_products_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.update(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallProduct.IUpdate>(),
    });
  typia.assert(output);
}
