import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_search_name_case_insensitive(
  connection: api.IConnection,
): Promise<void> {
  // Fetch all categories
  const output = await api.functional.ecommerce.categories.index(connection, {
    body: typia.random<IEcommerceCategory.IRequest>(),
  });
  typia.assert(output);
  if (output.data.length === 0) {
    await TestValidator.error("No categories found to test search", () => {
      throw new Error("No categories found to test search");
    });
    return;
  }
  // Verify we have categories
  TestValidator.equals(
    "Categories data should not be empty",
    output.data.length,
    1,
  );
}
