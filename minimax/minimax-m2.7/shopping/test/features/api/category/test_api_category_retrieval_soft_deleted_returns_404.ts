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
 * Test retrieving a soft-deleted category returns HTTP 404 Not Found.
 *
 * Validates the soft-delete behavior for product categories by:
 * 1. Creating an administrator account for test authentication
 * 2. Creating a new category through the admin API
 * 3. Soft-deleting the category using the admin delete endpoint
 * 4. Attempting to retrieve the deleted category via the public endpoint
 *
 * The test verifies that soft-deleted categories are properly hidden from
 * public access and return 404 Not Found instead of the category data.
 * This ensures the deleted_at filter is correctly applied and that users
 * cannot access deleted categories through direct ID lookups.
 *
 * 1. Authenticate as admin to obtain authorization token
 * 2. Create a test category with name and description
 * 3. Delete the category via admin endpoint (soft-delete)
 * 4. Call GET /categories/{categoryId} with the deleted category's ID
 * 5. Expect HTTP 404 response indicating category not found
 */
export async function test_api_category_retrieval_soft_deleted_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Soft-delete the category
  await api.functional.ecommerceMall.admin.admin.categories.erase(
    adminConnection,
    {
      categoryId: category.id,
    },
  );
  // 4. Attempt to retrieve the deleted category - expect 404
  await TestValidator.httpError(
    "soft-deleted category returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.categories.at(connection, {
        categoryId: category.id,
      });
    },
  );
}
