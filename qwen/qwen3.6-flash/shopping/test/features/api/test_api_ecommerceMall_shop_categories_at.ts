import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShopCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopCategory";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_shop_categories_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShopCategory =
    await api.functional.ecommerceMall.shop_categories.at(connection, {
      shopCategoryId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
