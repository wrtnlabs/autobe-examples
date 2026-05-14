import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import typia from "typia";

export async function test_api_ecommerceMall_customer_products_search_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallProduct.ISummary =
    await api.functional.ecommerceMall.customer.products.search.index(
      connection,
      {
        body: typia.random<IEcommerceMallProduct.IRequest>(),
      },
    );
  typia.assert(output);
}
