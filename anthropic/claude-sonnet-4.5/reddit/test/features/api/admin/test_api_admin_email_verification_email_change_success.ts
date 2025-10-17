import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

/**
 * Test admin account creation as foundation for email verification workflow.
 *
 * This test validates the admin registration process which is a prerequisite
 * for email verification scenarios. While the original scenario requested
 * testing email change verification, the available APIs do not provide
 * endpoints to:
 *
 * 1. Initiate email change requests
 * 2. Retrieve verification tokens
 * 3. Generate test verification tokens
 *
 * Therefore, this test focuses on the implementable portion: admin account
 * creation and validation of the initial registration flow. The admin account
 * created here would be the starting point for email verification workflows
 * once the necessary email change endpoints become available.
 *
 * Test Flow:
 *
 * 1. Generate random valid admin credentials
 * 2. Create admin account via join endpoint
 * 3. Validate account creation response structure
 * 4. Verify authentication tokens are issued
 * 5. Confirm account details match input data
 *
 * Expected Outcomes:
 *
 * - Admin account creation succeeds
 * - Response includes complete admin profile
 * - Authentication tokens (access and refresh) are provided
 * - Email is set to the provided value (not verified initially)
 * - Account is created with standard permissions (not super admin)
 */
export async function test_api_admin_email_verification_email_change_success(
  connection: api.IConnection,
) {
  // Step 1: Generate valid admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const adminCreateBody = {
    username: adminUsername,
    email: adminEmail,
    password: adminPassword,
  } satisfies IRedditLikeAdmin.ICreate;

  // Step 2: Create admin account
  const createdAdmin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });

  // Step 3: Validate admin account creation response
  typia.assert(createdAdmin);

  // Step 4: Verify account details match input
  TestValidator.equals(
    "created admin username matches input",
    createdAdmin.username,
    adminUsername,
  );
  TestValidator.equals(
    "created admin email matches input",
    createdAdmin.email,
    adminEmail,
  );

  // Step 5: Validate authentication tokens are provided
  TestValidator.predicate(
    "access token is provided",
    createdAdmin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is provided",
    createdAdmin.token.refresh.length > 0,
  );

  // Step 6: Validate account status
  TestValidator.equals(
    "email not verified initially",
    createdAdmin.email_verified,
    false,
  );
  TestValidator.equals(
    "admin is not super admin by default",
    createdAdmin.is_super_admin,
    false,
  );

  // Step 7: Validate token structure
  typia.assert(createdAdmin.token.expired_at);
  typia.assert(createdAdmin.token.refreshable_until);
}
