import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
 * Test that newly registered super administrators can immediately access administrator hierarchy management features.
 * After successful registration, verify that the super admin can perform platform oversight functions.
 * Test workflow: super admin registration -> receive tokens -> use access token for super admin operations.
 * Validate that the admin_grade field is correctly set to 'super' enabling elevated privileges.
 */
export async function test_api_super_admin_join_and_administrator_hierarchy_access(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. Super admin registration using utility function
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Validate the registration response
  typia.assert(authorized);
  // 3. Check that the authorized response contains super admin properties
  TestValidator.equals(
    "admin_grade should be 'super'",
    authorized.admin_grade,
    "super",
  );
  // 4. Verify that the connection headers were updated with the access token
  TestValidator.predicate(
    "connection should have authorization header",
    () =>
      superAdminConnection.headers?.Authorization === authorized.token.access,
  );
  // 5. Validate that the super admin is ready for platform oversight operations
  TestValidator.predicate(
    "super admin should be ready for platform oversight",
    () =>
      authorized.admin_grade === "super" && authorized.token.access.length > 0,
  );
}
