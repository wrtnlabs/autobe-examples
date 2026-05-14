import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShopCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopCategory";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_shop_categories_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShopCategory =
    await api.functional.ecommerceMall.admin.shop_categories.update(
      connection,
      {
        shopCategoryId: typia.random<string & tags.Format<"uuid">>(),
        body: typia.random<IEcommerceMallShopCategory.IUpdate>(),
      },
    );
  typia.assert(output);
}
