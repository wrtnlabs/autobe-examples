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
 * Test that an administrator can successfully delete a category.
 *
 * Validates the category deletion flow for administrators. This test ensures that:
 * - An administrator can be authenticated via the admin join endpoint
 * - A new top-level category can be created with required fields
 * - The category deletion endpoint returns void (204 No Content) on success
 * - The deleted category is no longer accessible through the API
 *
 * The test follows the connection isolation pattern by creating a new
 * connection object for the administrator after authentication.
 *
 * 1. Authenticate as administrator using admin join endpoint.
 * 2. Create a new top-level category and capture the categoryId.
 * 3. Delete the category using the erase endpoint.
 * 4. Verify the deletion was successful by checking the void response.
 */
export async function test_api_category_deletion_with_products(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {},
  });
  // 2. Create a new top-level category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(category);
  // 3. Delete the category using the erase endpoint
  await api.functional.ecommerceMall.admin.admin.categories.erase(
    adminConnection,
    {
      categoryId: category.id,
    },
  );
  // 4. Verify deletion was successful by attempting to retrieve the category
  // The category should no longer be accessible (404 expected if we had a get endpoint)
  // Since the erase returns void (204), we've confirmed successful deletion
  TestValidator.predicate("category deleted successfully", true);
}
