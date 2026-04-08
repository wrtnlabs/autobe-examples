import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test retrieving a subcategory that has a parent reference.
 *
 * Validates the complete flow of creating a parent category, then creating a subcategory under it,
 * and finally retrieving the subcategory to verify the parent reference is correctly populated.
 * Ensures that the parent object contains only id and name (ISummary format), and that the
 * subcategory has no children of its own.
 *
 * 1. Administrator authenticates with admin credentials.
 * 2. Creates a top-level parent category.
 * 3. Creates a subcategory with parent_id set to the parent category's id.
 * 4. Retrieves the subcategory via GET /categories/{categoryId}.
 * 5. Validates that parent field is non-null with id and name from parent.
 * 6. Validates that subcategories array is empty (leaf node).
 * 7. Validates that subcategories_count is 0.
 * 8. Retrieves the original parent category to confirm it exists independently.
 */
export async function test_api_category_retrieval_subcategory_with_parent_reference(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the parent
  const subcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve the subcategory via GET /categories/{categoryId}
  const retrieved = await api.functional.ecommerceMall.categories.at(
    connection,
    {
      categoryId: subcategory.id,
    },
  );
  typia.assert(retrieved);
  // 5. Validate that parent field is non-null
  TestValidator.predicate(
    "parent field is non-null",
    retrieved.parent !== null,
  );
  // 6. Validate that parent contains id and name from the parent category
  if (retrieved.parent !== null) {
    TestValidator.equals(
      "parent id matches original parent category id",
      retrieved.parent.id,
      parentCategory.id,
    );
    TestValidator.equals(
      "parent name matches original parent category name",
      retrieved.parent.name,
      parentCategory.name,
    );
    // Note: ISummary only contains id and name, so nested parent is not accessible
  }
  // 7. Validate that subcategories array is empty (leaf node)
  TestValidator.equals(
    "subcategories array is empty (leaf node)",
    retrieved.subcategories.length,
    0,
  );
  // 8. Validate that subcategories_count is 0
  TestValidator.equals(
    "subcategories_count is 0",
    retrieved.subcategories_count,
    0,
  );
  // 9. Verify original parent category still exists independently
  const retrievedParent = await api.functional.ecommerceMall.categories.at(
    connection,
    {
      categoryId: parentCategory.id,
    },
  );
  typia.assert(retrievedParent);
  TestValidator.equals(
    "parent category name preserved",
    retrievedParent.name,
    parentCategory.name,
  );
}
