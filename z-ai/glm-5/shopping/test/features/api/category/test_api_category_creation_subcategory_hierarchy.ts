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

export async function test_api_category_creation_subcategory_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test creating a subcategory under an existing parent category,
   * validating the two-level hierarchy system.
   *
   * Steps:
   * 1. Administrator authenticates via join endpoint
   * 2. Administrator creates a top-level parent category (e.g., 'Electronics')
   * 3. Administrator creates a subcategory (e.g., 'Smartphones') under the parent
   * 4. Verify the subcategory response contains correct hierarchy
   * 5. Verify the parent reference in subcategory matches the created parent
   */
  // Step 1: Administrator authenticates via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Administrator creates a top-level parent category
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
          parentId: null,
        },
      },
    );
  typia.assert(parentCategory);
  // Verify parent is a top-level category (no parent)
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent,
    null,
  );
  // Step 3: Administrator creates a subcategory under the parent
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and smartphones",
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // Step 4: Verify the subcategory response contains correct hierarchy
  // Parent reference in subcategory should match the created parent
  TestValidator.predicate(
    "subcategory has parent",
    subcategory.parent !== null,
  );
  TestValidator.equals(
    "subcategory parent id matches",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name matches",
    subcategory.parent?.name,
    parentCategory.name,
  );
  // Verify subcategory's parentId links to parent
  TestValidator.equals(
    "subcategory parentId",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // Step 5: Verify the parent category's children array includes the subcategory
  TestValidator.predicate(
    "parent has children",
    parentCategory.children.length > 0,
  );
  const childInParent = parentCategory.children.find(
    (child) => child.id === subcategory.id,
  );
  TestValidator.predicate(
    "subcategory in parent children",
    childInParent !== undefined,
  );
  TestValidator.equals(
    "child name matches",
    childInParent?.name,
    subcategory.name,
  );
  // Business validation: Two-level hierarchy is correctly established
  TestValidator.predicate(
    "subcategory is not top-level",
    subcategory.parent !== null,
  );
  TestValidator.predicate(
    "parent is top-level",
    parentCategory.parent === null,
  );
}
