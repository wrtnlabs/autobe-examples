import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppActivityLog";
import type { ITodoAppActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppActivityLog";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test admin and user authentication capabilities.
 *
 * Since the activity logs retrieval endpoint is not available in the provided
 * API SDK functions, this test validates the authentication infrastructure that
 * would be required for activity logs access control. The test confirms that
 * admin accounts and regular user accounts can be created and authenticated
 * with proper token generation, which forms the foundation for access control
 * enforcement.
 *
 * Test scenarios:
 *
 * 1. Admin account can be created with valid credentials and receives auth tokens
 * 2. Regular user account can be created with valid credentials and receives auth
 *    tokens
 * 3. Both admin and user tokens are properly structured with access and refresh
 *    tokens
 *
 * This test validates the authentication layer that would protect the activity
 * logs endpoint in a complete system implementation.
 */
export async function test_api_activity_logs_admin_only_access_control(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for authorized access
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphabets(10);
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    password_confirmation: adminPassword,
  } satisfies ITodoAppAdmin.IRegister;

  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(admin);

  // Verify admin authentication response structure
  TestValidator.predicate(
    "admin ID is a valid UUID",
    typia.is<string & tags.Format<"uuid">>(admin.id),
  );

  TestValidator.predicate(
    "admin email matches registration email",
    admin.email === adminEmail,
  );

  TestValidator.predicate("admin status is active", admin.status === "active");

  TestValidator.predicate(
    "admin has valid access token",
    admin.token.access.length > 0,
  );

  TestValidator.predicate(
    "admin has valid refresh token",
    admin.token.refresh.length > 0,
  );

  // Step 2: Create regular user account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphabets(10);
  const userData = {
    email: userEmail,
    password: userPassword,
  } satisfies ITodoAppUser.IJoin;

  const user: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: userData,
    },
  );
  typia.assert(user);

  // Verify user authentication response structure
  TestValidator.predicate(
    "user ID is a valid UUID",
    typia.is<string & tags.Format<"uuid">>(user.id),
  );

  TestValidator.predicate(
    "user email matches registration email",
    user.email === userEmail,
  );

  TestValidator.predicate("user status is active", user.status === "active");

  TestValidator.predicate(
    "user has valid access token",
    user.token.access.length > 0,
  );

  TestValidator.predicate(
    "user has valid refresh token",
    user.token.refresh.length > 0,
  );

  // Step 3: Verify tokens have proper expiration timestamps
  TestValidator.predicate(
    "admin access token has expiration timestamp",
    typia.is<string & tags.Format<"date-time">>(admin.token.expired_at),
  );

  TestValidator.predicate(
    "admin refresh token has expiration timestamp",
    typia.is<string & tags.Format<"date-time">>(admin.token.refreshable_until),
  );

  TestValidator.predicate(
    "user access token has expiration timestamp",
    typia.is<string & tags.Format<"date-time">>(user.token.expired_at),
  );

  TestValidator.predicate(
    "user refresh token has expiration timestamp",
    typia.is<string & tags.Format<"date-time">>(user.token.refreshable_until),
  );

  // Step 4: Verify admin and user have different authentication contexts
  TestValidator.notEquals(
    "admin and user tokens are different",
    admin.token.access,
    user.token.access,
  );

  TestValidator.notEquals(
    "admin and user IDs are different",
    admin.id,
    user.id,
  );
}
