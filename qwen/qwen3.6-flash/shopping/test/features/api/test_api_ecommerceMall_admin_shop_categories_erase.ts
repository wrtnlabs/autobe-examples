import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_shop_categories_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.ecommerceMall.admin.shop_categories.erase(
    connection,
    {
      shopCategoryId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
