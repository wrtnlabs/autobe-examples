import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
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
 * Test administrator category deletion for empty categories.
 *
 * Validates the category deletion endpoint structure and administrator authentication requirements. Tests that an administrator can access the category deletion endpoint with proper credentials.
 *
 * **SDK Limitation Note:** This test cannot fully validate successful deletion of an empty category because no category creation SDK function is available in the provided API functions. In a complete implementation, the test would:
 * 1. Create a category with no products and no subcategories
 * 2. Verify the category exists
 * 3. Delete the category
 * 4. Validate the category is soft-deleted (deleted_at set)
 * 5. Confirm the category is removed from listings
 *
 * This test validates the administrator authentication flow and deletion endpoint invocation structure.
 *
 * 1. Administrator registers and authenticates with the system.
 * 2. Deletion endpoint is called with a category ID (validation of non-existent category).
 * 3. Validates proper error handling when category does not exist.
 *
 * **Expected Behavior:** Since no category creation is possible with available SDK functions, this test uses a random UUID which will result in a 404 error, validating the endpoint's error handling for non-existent categories.
 */
export async function test_api_category_deletion_empty_category(
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
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Attempt to delete category (non-existent due to SDK limitation)
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Since we cannot create a category with available SDK functions,
  // this validates error handling for non-existent categories
  await TestValidator.httpError("category not found", 404, async () => {
    await api.functional.ecommerce.admin.categories.erase(adminConnection, {
      categoryId,
    });
  });
}
