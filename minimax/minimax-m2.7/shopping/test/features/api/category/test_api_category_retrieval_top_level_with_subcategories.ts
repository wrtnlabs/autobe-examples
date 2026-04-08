import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_retrieval_top_level_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create parent category "Electronics"
  const electronics =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(electronics);
  // 3. Create subcategory "Smartphones"
  const smartphones =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Smartphones",
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(smartphones);
  // 4. Create subcategory "Laptops"
  const laptops =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Laptops",
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(laptops);
  // 5. Retrieve the parent category with subcategories
  const category = await api.functional.ecommerceMall.categories.at(
    connection,
    {
      categoryId: electronics.id,
    },
  );
  typia.assert(category);
  // 6. Validate response
  TestValidator.equals("category id matches", category.id, electronics.id);
  TestValidator.equals("name is Electronics", category.name, "Electronics");
  TestValidator.equals(
    "description matches",
    category.description,
    "Electronic devices and accessories",
  );
  TestValidator.equals("parent is null for top-level", category.parent, null);
  TestValidator.equals(
    "subcategories count is 2",
    category.subcategories.length,
    2,
  );
  // Validate subcategories are ordered by name ascending (Laptops before Smartphones)
  TestValidator.equals(
    "first subcategory name is Laptops",
    category.subcategories[0].name,
    "Laptops",
  );
  TestValidator.equals(
    "second subcategory name is Smartphones",
    category.subcategories[1].name,
    "Smartphones",
  );
  // Validate each subcategory has id, name, and empty subcategories array
  TestValidator.equals(
    "Laptops subcategory has id",
    category.subcategories[0].id,
    laptops.id,
  );
  TestValidator.equals(
    "Laptops subcategory has empty subcategories",
    category.subcategories[0].subcategories.length,
    0,
  );
  TestValidator.equals(
    "Smartphones subcategory has id",
    category.subcategories[1].id,
    smartphones.id,
  );
  TestValidator.equals(
    "Smartphones subcategory has empty subcategories",
    category.subcategories[1].subcategories.length,
    0,
  );
}
