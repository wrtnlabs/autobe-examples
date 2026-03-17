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

export async function test_api_category_detail_subcategory_with_parent_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // 2. Create top-level parent category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Clothing",
          description: "Apparel and fashion items",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under parent
  const subCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
          name: "Men's Clothing",
          description: "Apparel for men",
        },
      },
    );
  typia.assert(subCategory);
  // 4. Retrieve subcategory detail (no authentication required)
  const publicConnection: api.IConnection = { host: connection.host };
  const detail = await api.functional.shoppingMall.categories.at(
    publicConnection,
    {
      categoryId: subCategory.id,
    },
  );
  typia.assert(detail);
  // 5. Validate subcategory detail fields
  TestValidator.equals("subcategory id matches", detail.id, subCategory.id);
  TestValidator.equals(
    "parent_id is non-null and matches parent",
    detail.parent_id,
    parentCategory.id,
  );
  TestValidator.predicate("parent is non-null", detail.parent !== null);
  // Validate parent summary fields
  TestValidator.equals(
    "parent summary id matches",
    detail.parent!.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent summary name matches",
    detail.parent!.name,
    "Clothing",
  );
  // Validate subcategory own fields
  TestValidator.equals(
    "subcategory name matches",
    detail.name,
    "Men's Clothing",
  );
  TestValidator.equals(
    "subcategory description matches",
    detail.description,
    "Apparel for men",
  );
  // Validate two-tier hierarchy: children must be empty
  TestValidator.equals("children is empty array", detail.children.length, 0);
}
