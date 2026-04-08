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

/**
 * Test category update with duplicate name validation within same parent level.
 *
 * Validates that updating a category to have a name that duplicates another category at the same parent level returns a 409 Conflict error. This ensures the name uniqueness constraint is properly enforced within parent hierarchies.
 *
 * The test follows these steps:
 * 1. Authenticate as administrator using authorize_admin_join utility function
 * 2. Create two root categories with unique names via update endpoint
 * 3. Attempt to update one category to have the same name as the other root category
 * 4. Verify the API returns 409 Conflict error with appropriate duplicate name message
 * 5. Confirm the original category name remains unchanged after failed update
 *
 * This validates that category names must be unique within the same parent level (root categories must have unique names among other root categories).
 */
export async function test_api_category_update_duplicate_name_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create two root categories with unique names
  const categoryId1 = typia.random<string & tags.Format<"uuid">>();
  const categoryId2 = typia.random<string & tags.Format<"uuid">>();
  const categoryName1 = RandomGenerator.name();
  const categoryName2 = RandomGenerator.name();
  // Create first category
  const category1 = await api.functional.ecommerce.admin.categories.update(
    adminConnection,
    {
      categoryId: categoryId1,
      body: {
        name: categoryName1,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceCategory.IUpdate,
    },
  );
  typia.assert(category1);
  // Create second category with different name
  const category2 = await api.functional.ecommerce.admin.categories.update(
    adminConnection,
    {
      categoryId: categoryId2,
      body: {
        name: categoryName2,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceCategory.IUpdate,
    },
  );
  typia.assert(category2);
  // 3. Attempt to update category2 to have the same name as category1
  // This should fail with 409 Conflict due to duplicate name constraint
  await TestValidator.httpError(
    "duplicate category name should return 409 Conflict",
    409,
    async () => {
      await api.functional.ecommerce.admin.categories.update(adminConnection, {
        categoryId: categoryId2,
        body: {
          name: categoryName1, // Attempt to use duplicate name
        } satisfies IEcommerceCategory.IUpdate,
      });
    },
  );
  // 4. Verify category2 still has its original name (update was rejected)
  const currentCategory2 =
    await api.functional.ecommerce.admin.categories.update(adminConnection, {
      categoryId: categoryId2,
      body: {
        description: RandomGenerator.paragraph({ sentences: 1 }), // Update description only
      } satisfies IEcommerceCategory.IUpdate,
    });
  typia.assert(currentCategory2);
  TestValidator.equals(
    "category name unchanged after failed duplicate update",
    currentCategory2.name,
    categoryName2,
  );
}
