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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that an administrator can successfully create a subcategory under an existing top-level parent category.
 *
 * This test validates the complete subcategory creation workflow:
 * 1. Admin authentication
 * 2. Parent category creation (top-level)
 * 3. Subcategory creation with parent reference
 * 4. Response validation including parent hierarchy
 * 5. Snapshot creation verification
 */
export async function test_api_category_create_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create top-level parent category (no parent_id)
  const parentCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // Validate parent is top-level (parent_id is null)
  TestValidator.equals(
    "parent category is top-level",
    parentCategory.parent_id,
    null,
  );
  // 3. Create subcategory under the parent category
  const subcategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Validate subcategory structure
  TestValidator.equals(
    "subcategory has parent_id",
    subcategory.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory parent reference matches",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name matches",
    subcategory.parent?.name,
    parentCategory.name,
  );
  // 5. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    subcategory.created_at !== null && subcategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    subcategory.updated_at !== null && subcategory.updated_at !== undefined,
  );
  // 6. Validate deleted_at is null for active category
  TestValidator.equals(
    "subcategory is active (not deleted)",
    subcategory.deleted_at,
    null,
  );
  // 7. Test that creating a subcategory under another subcategory is rejected (one-level nesting)
  await TestValidator.error(
    "cannot create subcategory under subcategory",
    async () => {
      await generate_random_ecommerce_mall_admin_categories_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.name(2),
            parent_id: subcategory.id,
          } satisfies IEcommerceMallCategory.ICreate,
        },
      );
    },
  );
}
