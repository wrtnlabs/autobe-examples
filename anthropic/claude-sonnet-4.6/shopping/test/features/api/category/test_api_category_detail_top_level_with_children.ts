import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_detail_top_level_with_children(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register admin and set up authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // 2. Create top-level parent category 'Electronics'
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Electronics",
          description: "All electronic products",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory 'Smartphones' under the parent
  const childCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
          name: "Smartphones",
          description: "Mobile phones and smartphones",
        },
      },
    );
  typia.assert(childCategory);
  // 4. Retrieve the top-level category detail (public endpoint, no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  const categoryDetail = await api.functional.shoppingMall.categories.at(
    publicConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  typia.assert(categoryDetail);
  // 5. Validate hierarchy metadata
  TestValidator.equals(
    "category id matches",
    categoryDetail.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent_id is null for top-level",
    categoryDetail.parent_id,
    null,
  );
  TestValidator.equals(
    "parent is null for top-level",
    categoryDetail.parent,
    null,
  );
  TestValidator.equals(
    "category name is Electronics",
    categoryDetail.name,
    "Electronics",
  );
  TestValidator.equals(
    "category description",
    categoryDetail.description,
    "All electronic products",
  );
  // 6. Validate children array is non-empty
  TestValidator.predicate(
    "children is non-empty",
    categoryDetail.children.length > 0,
  );
  // 7. Find the Smartphones child in the children array
  const smartphonesChild = categoryDetail.children.find(
    (child) => child.id === childCategory.id,
  );
  TestValidator.predicate(
    "Smartphones child exists",
    smartphonesChild !== undefined,
  );
  if (smartphonesChild !== undefined) {
    TestValidator.equals(
      "child name is Smartphones",
      smartphonesChild.name,
      "Smartphones",
    );
    TestValidator.equals(
      "child parent_id equals parent category id",
      smartphonesChild.parent_id,
      parentCategory.id,
    );
    TestValidator.equals(
      "child children is empty",
      smartphonesChild.children.length,
      0,
    );
  }
}
