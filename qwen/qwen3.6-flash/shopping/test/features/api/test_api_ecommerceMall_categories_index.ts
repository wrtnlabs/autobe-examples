import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShopCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopCategory";
import { IPageIEcommerceMallShopCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShopCategory";
import typia from "typia";

export async function test_api_ecommerceMall_categories_index(
  connection: api.IConnection,
) {
  const output: IPageIEcommerceMallShopCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(connection, {
      body: typia.random<IEcommerceMallShopCategory.IRequest>(),
    });
  typia.assert(output);
}
