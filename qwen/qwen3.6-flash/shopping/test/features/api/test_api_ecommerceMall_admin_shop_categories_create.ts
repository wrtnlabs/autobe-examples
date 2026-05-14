import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallShopCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopCategory";
import typia from "typia";

export async function test_api_ecommerceMall_admin_shop_categories_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallShopCategory =
    await api.functional.ecommerceMall.admin.shop_categories.create(
      connection,
      {
        body: typia.random<IEcommerceMallShopCategory.ICreate>(),
      },
    );
  typia.assert(output);
}
