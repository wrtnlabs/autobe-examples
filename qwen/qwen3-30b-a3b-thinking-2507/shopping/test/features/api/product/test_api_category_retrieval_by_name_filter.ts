import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieval_by_name_filter(
  connection: api.IConnection,
): Promise<void> {
  const searchTerm = "Electronics";
  const output: IPageIShoppingMallProductCategory.ISummary =
    await api.functional.shoppingMall.categories.index(connection, {
      body: {} satisfies IShoppingMallProductCategory.IRequest,
    });
  typia.assert(output);
  // Validate response structure
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  // Validate category data structure
  for (const category of output.data) {
    TestValidator.equals(
      `category name in search (${category.name})`,
      category.name.toLowerCase().includes(searchTerm.toLowerCase()),
      true,
    );
    TestValidator.equals(
      "category name defined",
      typeof category.name,
      "string",
    );
    TestValidator.equals(
      "category active is boolean",
      typeof category.active,
      "boolean",
    );
    // Validate image URLs if present
    if (category.imageUrl) {
      TestValidator.equals(
        "imageUrl format",
        category.imageUrl.startsWith("http://") ||
          category.imageUrl.startsWith("https://"),
        true,
      );
    }
    // Validate parent category structure if present
    if (category.parent) {
      TestValidator.equals(
        "parent category name defined",
        typeof category.parent.name,
        "string",
      );
      if (category.parent.imageUrl) {
        TestValidator.equals(
          "parent imageUrl format",
          category.parent.imageUrl.startsWith("http://") ||
            category.parent.imageUrl.startsWith("https://"),
          true,
        );
      }
    }
  }
}
