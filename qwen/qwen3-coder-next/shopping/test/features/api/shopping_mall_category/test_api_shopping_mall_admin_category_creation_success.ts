import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

/**
 * Test successful category creation with valid data.
 * 1. Admin joins the system
 * 2. Admin creates a root category with unique name and description
 * 3. Verify response contains created category with auto-generated ID
 * 4. Verify category is stored in database with correct fields
 * 5. Verify created_at and updated_at timestamps are set
 */
export async function test_api_shopping_mall_admin_category_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: `admin+test-${RandomGenerator.alphabets(6)}@test.com`,
    password: "1234",
  } satisfies IShoppingMallAdmin.IJoin;
  await api.functional.shoppingMall.auth.admin.join(adminConnection, {
    body: adminCredentials,
  });
  // Step 2: Create a root category with unique name and description
  const categoryName = `Test Category ${RandomGenerator.alphabets(8)}`;
  const categoryDescription = `Description for ${categoryName}`;
  const category: IShoppingMallCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  // Step 3: Verify response contains created category with auto-generated ID
  typia.assert(category);
  TestValidator.predicate(
    "category has ID",
    category.id !== undefined && category.id !== null,
  );
  TestValidator.equals("category name matches", category.name, categoryName);
  TestValidator.equals(
    "category description matches",
    category.description,
    categoryDescription,
  );
  // Step 4: Verify parent_category is null for root category
  TestValidator.equals(
    "parent category is null",
    category.parent_category,
    null,
  );
  // Step 5: Verify timestamps are set
  TestValidator.predicate(
    "created_at is set",
    category.created_at !== undefined && category.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is set",
    category.updated_at !== undefined && category.updated_at !== null,
  );
  TestValidator.equals("deleted_at is null", category.deleted_at, null);
}
