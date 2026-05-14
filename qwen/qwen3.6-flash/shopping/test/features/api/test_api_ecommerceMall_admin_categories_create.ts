import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import typia from "typia";

export async function test_api_ecommerceMall_admin_categories_create(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCategory =
    await api.functional.ecommerceMall.admin.categories.create(connection, {
      body: typia.random<IEcommerceMallCategory.ICreate>(),
    });
  typia.assert(output);
}
