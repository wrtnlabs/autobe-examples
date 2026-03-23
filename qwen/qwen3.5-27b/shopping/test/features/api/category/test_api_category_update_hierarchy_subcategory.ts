import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_category_update_hierarchy_subcategory(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test category hierarchy update where a top-level category becomes a subcategory.
   * Validates parent_id update, parent relationship, and timestamp refresh.
   */
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create first top-level category (will become parent)
  const parentCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create second top-level category (will become subcategory)
  const childCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  // Store original values for comparison
  const originalName = childCategory.name;
  const originalDescription = childCategory.description;
  const originalCreatedAt = childCategory.created_at;
  const originalUpdatedAt = childCategory.updated_at;
  // 4. Update child category to become subcategory of parent
  const updatedCategory =
    await api.functional.shoppingMall.admin.admin.categories.update(
      adminConnection,
      {
        categoryId: childCategory.id,
        body: {
          parent_id: parentCategory.id,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate parent_id is correctly updated
  TestValidator.equals(
    "parent_id updated to parent category",
    updatedCategory.parent?.id,
    parentCategory.id,
  );
  // 6. Validate parent category object is returned
  TestValidator.predicate(
    "parent object exists in response",
    updatedCategory.parent !== null && updatedCategory.parent !== undefined,
  );
  // 7. Validate parent object has correct id
  TestValidator.equals(
    "parent id matches",
    updatedCategory.parent?.id,
    parentCategory.id,
  );
  // 8. Validate parent name matches
  TestValidator.equals(
    "parent name matches",
    updatedCategory.parent?.name,
    parentCategory.name,
  );
  // 9. Validate other fields remain unchanged (name)
  TestValidator.equals("name unchanged", updatedCategory.name, originalName);
  // 10. Validate other fields remain unchanged (description)
  TestValidator.equals(
    "description unchanged",
    updatedCategory.description,
    originalDescription,
  );
  // 11. Validate created_at unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    originalCreatedAt,
  );
  // 12. Validate updated_at is refreshed (different from original)
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedCategory.updated_at,
    originalUpdatedAt,
  );
  // 13. Validate updated_at is after original
  TestValidator.predicate(
    "updated_at is after original",
    new Date(updatedCategory.updated_at).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );
  // 14. Fetch parent category again to validate subcategories array
  const refreshedParentCategory =
    await api.functional.shoppingMall.admin.admin.categories.update(
      adminConnection,
      {
        categoryId: parentCategory.id,
        body: {} satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(refreshedParentCategory);
  // 15. Validate parent's subcategories array includes updated category
  TestValidator.predicate(
    "parent subcategories includes this category",
    refreshedParentCategory.subcategories.some(
      (sub) => sub.id === updatedCategory.id,
    ),
  );
  // 16. Validate subcategory has correct parent reference
  const subcategoryInParent = refreshedParentCategory.subcategories.find(
    (sub) => sub.id === updatedCategory.id,
  );
  TestValidator.predicate(
    "subcategory exists in parent",
    subcategoryInParent !== undefined,
  );
  TestValidator.equals(
    "subcategory parent reference correct",
    subcategoryInParent?.parent?.id,
    parentCategory.id,
  );
}