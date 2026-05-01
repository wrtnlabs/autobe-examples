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
 * Test retrieval of a parent category with its immediate subcategories.
 *
 * Validates that when a top-level category containing subcategories is retrieved, the response includes the full children array with IShoppingMallCategory.ISummary objects for each active child. Each child summary must correctly reference the parent via parent_id and include all required summary fields.
 *
 * 1. Administrator registers and authenticates via authorize_admin_join.
 * 2. Administrator creates a top-level parent category with no parent_id.
 * 3. Administrator creates two subcategories under the parent by providing parent_id.
 * 4. Parent category is retrieved by its ID using the public category endpoint.
 * 5. Validates that parent field is null for the top-level category.
 * 6. Validates children array contains exactly two subcategory summaries.
 * 7. Each child summary's parent_id matches the parent category's id.
 */
export async function test_api_category_retrieve_parent_with_children(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent top-level category
  const parent = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(parent);
  // 3. Create two subcategories under the parent
  const child1 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { parent_id: parent.id } },
  );
  typia.assert(child1);
  const child2 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { parent_id: parent.id } },
  );
  typia.assert(child2);
  // 4. Retrieve parent category
  const retrieved = await api.functional.shoppingMall.categories.at(
    adminConnection,
    { categoryId: parent.id },
  );
  typia.assert(retrieved);
  // 5. Validate parent field is null for top-level
  TestValidator.equals("parent is null for top-level", retrieved.parent, null);
  // 6. Validate children array contains exactly two subcategories
  TestValidator.equals("children count matches", retrieved.children.length, 2);
  // 7. Each child summary must reference the parent correctly
  const childIds = new Set([child1.id, child2.id]);
  for (const child of retrieved.children) {
    TestValidator.equals(
      "child parent_id matches parent",
      child.parent_id,
      parent.id,
    );
    TestValidator.predicate(
      "child id is one of created subcategories",
      childIds.has(child.id),
    );
  }
}
