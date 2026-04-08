import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_categories_create } from "../../../generate/generate_random_ecommerce_admin_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

/**
 * Test administrator subcategory creation under a parent category.
 *
 * Validates the complete category hierarchy workflow where administrators create root categories and then create subcategories under them. Ensures that the subcategory correctly references its parent category and that the one-level nesting rule is properly enforced (subcategories cannot have their own subcategories).
 *
 * The test verifies the two-level category hierarchy structure by creating a parent category first, then creating a subcategory that references the parent. It validates that the parent field in the subcategory response matches the expected parent category, and that attempting to create a subcategory under an existing subcategory fails as expected.
 *
 * 1. Administrator authenticates with category management permissions.
 * 2. Administrator creates a parent category (root level with parent_id = null).
 * 3. Administrator creates a subcategory with parent_id referencing the parent category.
 * 4. Validates subcategory's parent field correctly references the parent category.
 * 5. Tests one-level nesting rule by attempting to create subcategory under subcategory (should fail).
 */
export async function test_api_category_create_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create parent category (root level)
  const parentCategory =
    await generate_random_ecommerce_admin_categories_create(adminConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: null,
      } satisfies IEcommerceCategory.ICreate,
    });
  typia.assert(parentCategory);
  // 3. Create subcategory under parent
  const subcategory = await generate_random_ecommerce_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: parentCategory.id,
      } satisfies IEcommerceCategory.ICreate,
    },
  );
  typia.assert(subcategory);
  // 4. Validate subcategory's parent reference
  TestValidator.equals(
    "subcategory has parent",
    subcategory.parent !== null,
    true,
  );
  TestValidator.equals(
    "parent ID matches",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    subcategory.parent?.name,
    parentCategory.name,
  );
  TestValidator.predicate("subcategory name set", subcategory.name.length > 0);
  // 5. Test one-level nesting rule - subcategory cannot have subcategories
  await TestValidator.error(
    "subcategory cannot have subcategories",
    async () => {
      await generate_random_ecommerce_admin_categories_create(adminConnection, {
        body: {
          name: RandomGenerator.name(),
          description: null,
          parent_id: subcategory.id,
        } satisfies IEcommerceCategory.ICreate,
      });
    },
  );
}
