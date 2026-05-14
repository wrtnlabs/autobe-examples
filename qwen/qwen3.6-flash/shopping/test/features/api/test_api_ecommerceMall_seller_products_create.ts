import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import typia from "typia";

export async function test_api_ecommerceMall_seller_products_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.create(connection, {
      body: typia.random<IEcommerceMallProduct.ICreate>(),
    });
  typia.assert(output);
}
