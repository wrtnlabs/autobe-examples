import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_admin_categories_update(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCategory =
    await api.functional.ecommerceMall.admin.categories.update(connection, {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IEcommerceMallCategory.IUpdate>(),
    });
  typia.assert(output);
}
