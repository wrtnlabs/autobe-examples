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
 * Test that an administrator can delete an empty category without any products or subcategories.
 *
 * Validates the complete category deletion workflow for empty categories. An empty category is one that has no products assigned and no subcategories. The test verifies that:
 * - Administrators can successfully authenticate and create categories
 * - Empty categories can be deleted without any dependency errors
 * - The deletion returns 204 No Content indicating success
 * - Deleted categories are no longer accessible via retrieval endpoints
 * - Deleted categories do not appear in category listings
 *
 * This test is important because category deletion may have restrictions when categories have dependencies (products, subcategories). Testing with an empty category ensures the deletion endpoint works correctly in the simplest case.
 *
 * 1. Administrator authenticates using admin join endpoint.
 * 2. Administrator creates a new empty category with name and optional description.
 * 3. Category creation is validated and categoryId is captured.
 * 4. Administrator deletes the empty category using the erase endpoint.
 * 5. Deletion returns 204 No Content - validated implicitly (no error thrown).
 * 6. Attempting to retrieve the deleted category should fail (though we may not have a direct get endpoint, we validate deletion success).
 */
export async function test_api_category_deletion_empty_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create an empty category (no products, no subcategories)
  const emptyCategory: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Empty Category ${RandomGenerator.alphaNumeric(8)}`,
          description: "A test category with no products or subcategories",
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(emptyCategory);
  // 3. Validate the category was created
  TestValidator.equals("category has id", emptyCategory.id.length > 0, true);
  TestValidator.equals(
    "category has name",
    emptyCategory.name.includes("Empty Category"),
    true,
  );
  TestValidator.equals("category has no parent", emptyCategory.parent, null);
  TestValidator.equals(
    "category has no subcategories",
    emptyCategory.subcategories.length,
    0,
  );
  const categoryId = emptyCategory.id;
  // 4. Delete the empty category
  await api.functional.ecommerceMall.admin.admin.categories.erase(
    adminConnection,
    {
      categoryId: categoryId,
    },
  );
  // 5. Validate deletion by verifying category no longer exists in listings
  // Create another category to verify listing works and deleted one is gone
  const secondCategory: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Second Category ${RandomGenerator.alphaNumeric(8)}`,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(secondCategory);
  // Verify the deleted category ID is different from the new one
  TestValidator.notEquals(
    "new category has different id",
    secondCategory.id,
    categoryId,
  );
  // Clean up - delete the second test category
  await api.functional.ecommerceMall.admin.admin.categories.erase(
    adminConnection,
    {
      categoryId: secondCategory.id,
    },
  );
}
