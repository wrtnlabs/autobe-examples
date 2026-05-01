import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
 * Test retrieval of a top-level category by its ID with hierarchy validation.
 *
 * Validates that a top-level category created without a parent_id can be
 * retrieved via the public GET endpoint and correctly represents its position
 * in the two-level category hierarchy. Ensures the parent field is null for
 * top-level categories, the children array is empty when no subcategories
 * exist, and the name/description match the creation input.
 *
 * 1. Administrator authenticates and creates a top-level category.
 * 2. The category is retrieved by its ID through the public endpoint.
 * 3. Validates that all fields are present, parent is null, children is empty,
 *    and the name and description match the creation payload.
 */
export async function test_api_category_retrieve_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create top-level category with controlled name and description
  const categoryName = RandomGenerator.name();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 5 });
  const created = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: categoryName,
        description: categoryDescription,
      },
    },
  );
  typia.assert(created);
  // 3. Retrieve category by ID through public endpoint (no authentication required)
  const retrieved = await api.functional.shoppingMall.categories.at(
    { host: connection.host },
    { categoryId: created.id },
  );
  typia.assert(retrieved);
  // 4. Validate business logic — hierarchy position and data fidelity
  TestValidator.equals(
    "category id matches created id",
    retrieved.id,
    created.id,
  );
  TestValidator.equals(
    "category name matches creation input",
    retrieved.name,
    categoryName,
  );
  TestValidator.equals(
    "category description matches creation input",
    retrieved.description,
    categoryDescription,
  );
  TestValidator.equals(
    "parent is null for top-level category",
    retrieved.parent,
    null,
  );
  TestValidator.equals(
    "children array is empty for category with no subcategories",
    retrieved.children.length,
    0,
  );
  TestValidator.equals(
    "deleted_at is null for active category",
    retrieved.deleted_at,
    null,
  );
}
