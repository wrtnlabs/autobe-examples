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
 * Test subcategory retrieval including parent category context for proper hierarchy rendering.
 *
 * Validates that when a subcategory is retrieved by its ID, the response includes the parent field populated with an IShoppingMallCategory.ISummary object containing the parent's id, name, and description. This enables clients to render breadcrumb navigation and understand the subcategory's position within the two-level hierarchy.
 *
 * The platform enforces a strict one-level nesting limit — a subcategory cannot itself be a parent to further subcategories. Therefore, the children array on any retrieved subcategory must be empty, and the parent summary's own parent_id must be null since the parent is always a top-level category.
 *
 * 1. Administrator registers and authenticates on the platform.
 * 2. Administrator creates a top-level parent category with randomized name and description.
 * 3. Administrator creates a subcategory under the parent by providing the parent_id.
 * 4. Retrieve the subcategory by its ID through the public category endpoint.
 * 5. Validate parent field is populated with correct parent id, name, and description.
 * 6. Validate children array is empty and parent summary's parent_id is null.
 */
export async function test_api_category_retrieve_subcategory_with_parent_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent top-level category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under the parent
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      { body: { parent_id: parentCategory.id } },
    );
  typia.assert(subcategory);
  // 4. Retrieve the subcategory by ID
  const retrieved = await api.functional.shoppingMall.categories.at(
    connection,
    { categoryId: subcategory.id },
  );
  typia.assert(retrieved);
  // 5. Validate parent context is populated
  TestValidator.predicate(
    "subcategory must have a parent",
    retrieved.parent !== null,
  );
  TestValidator.equals(
    "parent id matches",
    retrieved.parent!.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    retrieved.parent!.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "parent description matches",
    retrieved.parent!.description,
    parentCategory.description,
  );
  // 6. Validate parent summary's own parent_id is null (top-level category)
  TestValidator.equals(
    "parent summary parent_id is null (parent is top-level)",
    retrieved.parent!.parent_id,
    null,
  );
  // 7. Validate children array is empty (one-level nesting limit)
  TestValidator.equals(
    "subcategory children must be empty",
    retrieved.children,
    [],
  );
  // 8. Validate subcategory's own identity
  TestValidator.equals(
    "retrieved id matches created subcategory",
    retrieved.id,
    subcategory.id,
  );
  TestValidator.equals(
    "retrieved name matches created subcategory",
    retrieved.name,
    subcategory.name,
  );
}
