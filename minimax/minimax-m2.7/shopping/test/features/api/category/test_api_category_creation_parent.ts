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

export async function test_api_category_creation_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Create a top-level parent category (no parent_id)
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const body = {
    name: categoryName,
    description: categoryDescription,
  } satisfies IEcommerceMallCategory.ICreate;
  const category =
    await api.functional.ecommerceMall.superAdmin.categories.create(
      superAdminConnection,
      { body },
    );
  typia.assert(category);
  // 3. Validate the created category structure
  TestValidator.equals(
    "category has valid UUID id",
    category.id.length > 0,
    true,
  );
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryDescription,
  );
  TestValidator.equals(
    "parent is null for top-level category",
    category.parent,
    null,
  );
  TestValidator.equals(
    "subcategories is empty array",
    category.subcategories.length,
    0,
  );
  TestValidator.equals(
    "products_count is zero for new category",
    category.products_count,
    0,
  );
  TestValidator.equals(
    "deleted_at is null for active category",
    category.deleted_at,
    null,
  );
  // 4. Create another parent category to test uniqueness within scope
  const secondCategoryName = RandomGenerator.paragraph({ sentences: 1 });
  const secondBody = {
    name: secondCategoryName,
  } satisfies IEcommerceMallCategory.ICreate;
  const secondCategory =
    await api.functional.ecommerceMall.superAdmin.categories.create(
      superAdminConnection,
      { body: secondBody },
    );
  typia.assert(secondCategory);
  TestValidator.equals(
    "second category has unique name",
    secondCategory.name,
    secondCategoryName,
  );
  TestValidator.equals(
    "second category also has null parent",
    secondCategory.parent,
    null,
  );
}