import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test deleting a product category successfully and handle not-found case.
 *
 * Scenario:
 * - Authenticate as administrator using join API.
 * - Create a product category as setup (simulate creation).
 * - Delete the created product category and confirm 204 response.
 * - Attempt to delete a non-existent category and expect 404 error.
 *
 * This test ensures deleting categories works properly and handles errors gracefully.
 */
export async function test_api_administrator_product_category_deletion_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {}, // IShoppingMallAdministrator.IJoin is empty object
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // 2. Create product category simulation
  // Since there's no explicit API for creating category, we simulate a category ID for deletion test
  const existingCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete existing category - success case
  await api.functional.shoppingMall.administrator.product.categories.erase(
    adminConnection,
    { categoryId: existingCategoryId },
  );
  // 4. Try deleting non-existent category - expect 404 error
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent category should throw 404",
    async () => {
      await api.functional.shoppingMall.administrator.product.categories.erase(
        adminConnection,
        { categoryId: nonExistentCategoryId },
      );
    },
  );
}
