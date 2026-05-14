import api from "@ORGANIZATION/PROJECT-api";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import typia, { tags } from "typia";

export async function test_api_ecommerceMall_categories_at(
  connection: api.IConnection,
) {
  const output: IEcommerceMallCategory =
    await api.functional.ecommerceMall.categories.at(connection, {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
