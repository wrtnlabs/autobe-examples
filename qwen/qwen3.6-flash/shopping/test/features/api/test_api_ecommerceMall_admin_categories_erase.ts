import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_categories_erase(
  connection: api.IConnection,
) {
  const output = await api.functional.ecommerceMall.admin.categories.erase(
    connection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
