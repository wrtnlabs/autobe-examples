import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test deletion of non-existent category returns 404 error.
 *
 * Validates that attempting to delete a category that does not exist in the system
 * returns an appropriate 404 Not Found HTTP error. This ensures proper error handling
 * when the specified category ID cannot be found.
 *
 * 1. SuperAdmin authenticates using the join endpoint to obtain authorization.
 * 2. Generates a random UUID that does not exist in the system.
 * 3. Attempts to delete the non-existent category using the erase endpoint.
 * 4. Expects the API to return 404 Not Found error.
 *
 * This test verifies the robustness of error handling for invalid resource references.
 */
export async function test_api_category_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate a random UUID that doesn't exist in the system
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to delete non-existent category - expect 404 error
  await TestValidator.httpError("404 for non-existent category", 404, () =>
    api.functional.ecommerceMall.superAdmin.admin.categories.erase(
      superAdminConnection,
      {
        categoryId: nonExistentCategoryId,
      },
    ),
  );
}
