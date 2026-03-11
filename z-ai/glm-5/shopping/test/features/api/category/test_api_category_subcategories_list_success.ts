import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_administrator_categories_subcategories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_subcategories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_subcategories_list_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator setup - create isolated connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // Step 2: Create parent category using utility function
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(parentCategory);
  // Step 3: Create multiple subcategories under the parent
  const subcategoryNames = ["Smartphones", "Laptops", "Tablets"];
  const createdSubcategories: IShoppingMallCategory[] = [];
  for (const subcategoryName of subcategoryNames) {
    const subcategory =
      await generate_random_shopping_mall_administrator_categories_subcategories_create(
        adminConnection,
        {
          params: {
            categoryId: parentCategory.id,
          },
          body: {
            name: subcategoryName,
            description: `${subcategoryName} category under Electronics`,
          },
        },
      );
    typia.assert(subcategory);
    createdSubcategories.push(subcategory);
  }
  // Step 4: Retrieve subcategories list using the subcategories endpoint
  const response =
    await api.functional.shoppingMall.categories.subcategories.index(
      connection,
      {
        categoryId: parentCategory.id,
        body: {
          sort: "name",
          direction: "asc",
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(response);
  // Step 5: Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    () => response.pagination !== null,
  );
  TestValidator.predicate(
    "current page is 1",
    () => response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination has records",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    () => response.pagination.pages >= 0,
  );
  // Step 6: Validate data array
  TestValidator.equals("data array length", response.data.length, 3);
  // Step 7: Validate all subcategories have correct parent
  for (const subcategory of response.data) {
    TestValidator.predicate(
      "subcategory has parent",
      () => subcategory.parent !== null,
    );
    if (subcategory.parent !== null) {
      TestValidator.equals(
        "parent ID matches",
        subcategory.parent.id,
        parentCategory.id,
      );
    }
    TestValidator.equals("deleted_at is null", subcategory.deleted_at, null);
  }
  // Step 8: Validate results are sorted alphabetically by name
  const sortedNames = subcategoryNames.slice().sort();
  const responseNames = response.data.map((subcategory) => subcategory.name);
  TestValidator.equals("sorted order matches", responseNames, sortedNames);
}
