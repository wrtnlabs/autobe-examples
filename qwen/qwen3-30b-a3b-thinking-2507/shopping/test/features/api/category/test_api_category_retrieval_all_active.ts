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

export async function test_api_category_retrieval_all_active(
  connection: api.IConnection,
): Promise<void> {
  const response = await api.functional.shoppingMall.categories.index(
    connection,
    {
      body: typia.random<IShoppingMallProductCategory.IRequest>(),
    },
  );
  typia.assert(response);
  // Verify pagination metadata
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "records count should be non-negative",
    response.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pages count should be non-negative",
    response.pagination.pages >= 0,
    true,
  );
  // Verify data is non-empty
  TestValidator.equals(
    "category data should contain at least one item",
    response.data.length > 0,
    true,
  );
  // Verify the first category
  const category = response.data[0];
  TestValidator.equals(
    "category id should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
    true,
  );
  TestValidator.equals(
    "category name should be non-empty",
    category.name.length > 0,
    true,
  );
  TestValidator.equals(
    "category active status should be boolean",
    typeof category.active === "boolean",
    true,
  );
  // Handle optional properties
  if (category.imageUrl) {
    TestValidator.equals(
      "category image URL should be a valid URI",
      /^https?:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/\S*)?$/i.test(
        category.imageUrl,
      ),
      true,
    );
  }
  if (category.parent) {
    TestValidator.equals(
      "category parent ID should be valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        category.parent.id,
      ),
      true,
    );
    TestValidator.equals(
      "category parent name should be non-empty",
      category.parent.name.length > 0,
      true,
    );
  }
}
