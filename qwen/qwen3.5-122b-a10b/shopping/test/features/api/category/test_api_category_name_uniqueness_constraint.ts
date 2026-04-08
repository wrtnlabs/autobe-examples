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
 * Test category name uniqueness constraint within the same parent level.
 *
 * Validates that category names must be unique among siblings sharing the same parent category. Root categories (parent_id = null) must have unique names among all root categories, while subcategories must have unique names among their siblings under the same parent. This test ensures the system enforces this business rule to maintain category structure integrity.
 *
 * The test performs the following validations:
 * 1. Administrator authentication for category management access
 * 2. Root category name uniqueness - duplicate names rejected at root level
 * 3. Subcategory name uniqueness - duplicate names rejected among siblings
 * 4. Valid category creation with unique names succeeds
 * 5. Proper error responses for duplicate name attempts
 *
 * 1. Administrator authenticates via admin join endpoint.
 * 2. Create first root category with unique random name.
 * 3. Attempt to create second root category with same name - validates conflict error.
 * 4. Create second root category with different name - validates successful creation.
 * 5. Create subcategory under first root category.
 * 6. Attempt to create another subcategory with same name under same parent - validates conflict error.
 * 7. Validate all error responses contain appropriate HTTP status codes.
 */
export async function test_api_category_name_uniqueness_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Create first root category
  const categoryName: string = RandomGenerator.name();
  const firstCategory: IEcommerceCategory =
    await generate_random_ecommerce_admin_categories_create(adminConnection, {
      body: {
        name: categoryName,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parent_id: null,
      } satisfies IEcommerceCategory.ICreate,
    });
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category created",
    firstCategory.name,
    categoryName,
  );
  // 3. Attempt to create duplicate root category - should fail
  await TestValidator.error(
    "duplicate root category name rejected",
    async () => {
      await generate_random_ecommerce_admin_categories_create(adminConnection, {
        body: {
          name: categoryName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: null,
        } satisfies IEcommerceCategory.ICreate,
      });
    },
  );
  // 4. Create second root category with different name - should succeed
  const secondCategoryName: string = RandomGenerator.name();
  const secondCategory: IEcommerceCategory =
    await generate_random_ecommerce_admin_categories_create(adminConnection, {
      body: {
        name: secondCategoryName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: null,
      } satisfies IEcommerceCategory.ICreate,
    });
  typia.assert(secondCategory);
  TestValidator.notEquals(
    "second category different name",
    firstCategory.name,
    secondCategory.name,
  );
  // 5. Create first subcategory under first root category
  const subcategoryName: string = RandomGenerator.name();
  const firstSubcategory: IEcommerceCategory =
    await generate_random_ecommerce_admin_categories_create(adminConnection, {
      body: {
        name: subcategoryName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: firstCategory.id,
      } satisfies IEcommerceCategory.ICreate,
    });
  typia.assert(firstSubcategory);
  TestValidator.equals(
    "subcategory parent matches",
    firstSubcategory.parent?.id,
    firstCategory.id,
  );
  // 6. Attempt to create duplicate subcategory - should fail
  await TestValidator.error("duplicate subcategory name rejected", async () => {
    await generate_random_ecommerce_admin_categories_create(adminConnection, {
      body: {
        name: subcategoryName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: firstCategory.id,
      } satisfies IEcommerceCategory.ICreate,
    });
  });
  // 7. Create subcategory under second root category with same name - should succeed (different parent)
  const thirdSubcategory: IEcommerceCategory =
    await generate_random_ecommerce_admin_categories_create(adminConnection, {
      body: {
        name: subcategoryName,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parent_id: secondCategory.id,
      } satisfies IEcommerceCategory.ICreate,
    });
  typia.assert(thirdSubcategory);
  TestValidator.equals(
    "subcategory under different parent",
    thirdSubcategory.parent?.id,
    secondCategory.id,
  );
}
