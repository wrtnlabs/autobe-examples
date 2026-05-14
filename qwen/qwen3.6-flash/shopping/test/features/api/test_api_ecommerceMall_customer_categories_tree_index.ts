import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import typia from "typia";

export async function test_api_ecommerceMall_customer_categories_tree_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.customer.categories.tree.index(
      connection,
      {
        body: typia.random<IEcommerceMallCategory.IRequest>(),
      },
    );
  typia.assert(output);
}
