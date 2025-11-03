import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin registration with valid credentials and immediate authentication.
 *
 * This test validates the complete admin registration workflow where a new
 * administrator creates an account with valid email and password credentials.
 * The system should create the admin account, hash the password securely,
 * generate JWT tokens, and automatically authenticate the newly registered
 * admin for immediate system access.
 *
 * Steps:
 *
 * 1. Generate valid admin registration data with proper email format and secure
 *    password
 * 2. Call the admin registration API endpoint
 * 3. Validate the response contains complete admin profile information
 * 4. Verify JWT tokens (access and refresh) are returned with proper expiration
 * 5. Confirm the access token is automatically set in connection headers
 */
export async function test_api_admin_registration_with_valid_credentials(
  connection: api.IConnection,
) {
  // Step 1: Generate valid admin registration data
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10), // 10 characters, meets minimum 8 requirement
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string>(),
  } satisfies ITodoListAdmin.ICreate;

  // Step 2: Call admin registration endpoint
  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the response structure and data (complete type validation)
  typia.assert(registeredAdmin);

  // Step 4: Verify business logic - email matches input
  TestValidator.equals(
    "registered email matches input",
    registeredAdmin.email,
    registrationData.email,
  );

  // Step 5: Verify business logic - account is active (not soft deleted)
  TestValidator.equals(
    "deleted_at should be null for active account",
    registeredAdmin.deleted_at,
    null,
  );

  // Step 6: Verify automatic authentication by checking connection headers
  TestValidator.predicate(
    "access token should be set in connection headers",
    connection.headers?.Authorization === registeredAdmin.token.access,
  );
}
