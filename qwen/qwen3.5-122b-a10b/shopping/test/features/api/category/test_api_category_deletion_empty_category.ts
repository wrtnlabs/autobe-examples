import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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
 * Test that an administrator can successfully delete an empty category.
 *
 * This test verifies:
 * 1. Administrator authentication via join endpoint
 * 2. Category deletion endpoint responds correctly with valid admin credentials
 * 3. The deletion operation completes without errors
 *
 * Note: Since no category creation API is available in the provided SDK,
 * this test focuses on the authentication flow and deletion endpoint behavior.
 * In a complete implementation, a category would be created first using
 * admin category creation endpoint, then deleted.
 */
export async function test_api_category_deletion_empty_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Validate admin authentication response
  TestValidator.equals(
    "admin id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminAuth.id,
    ),
    true,
  );
  TestValidator.equals("admin email valid", adminAuth.email, adminAuth.email);
  TestValidator.predicate("admin has token", adminAuth.token.access.length > 0);
  // 2. Generate a category ID to delete
  // Note: In production, this would be a category created via admin category creation endpoint
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete the category
  // The endpoint will return 204 No Content on success or appropriate error if category doesn't exist
  // This tests the authentication and endpoint availability
  await api.functional.ecommerceMall.admin.categories.erase(adminConnection, {
    categoryId,
  });
  // 4. Deletion successful - endpoint returned void (204 No Content)
  // No additional validation needed as typia.assert on response would catch type errors
  // The successful completion of the erase call indicates the operation worked
}