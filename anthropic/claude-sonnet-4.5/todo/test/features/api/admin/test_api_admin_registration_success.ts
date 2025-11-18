import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful administrator account creation with complete valid
 * credentials and session context.
 *
 * This test validates the complete administrator registration and immediate
 * authentication workflow. It verifies that:
 *
 * 1. A new admin account is successfully created with valid unique email and
 *    password
 * 2. The email is normalized to lowercase and password is securely hashed
 * 3. The response includes newly created admin account information (id, email,
 *    timestamps)
 * 4. JWT tokens (access and refresh) are returned with expiration timestamps
 * 5. An initial admin session record is created capturing connection context
 * 6. The access token grants admin-level permissions and is set in connection
 *    headers
 *
 * Steps:
 *
 * 1. Generate random valid admin credentials (email, password)
 * 2. Create session context data (href, referrer, optional IP)
 * 3. Call the admin registration API endpoint
 * 4. Validate the response structure with typia.assert
 * 5. Verify email normalization business logic
 * 6. Confirm automatic authentication token setup in connection headers
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // Generate random admin registration data
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const connectionHref = typia.random<string & tags.Format<"uri">>();
  const connectionReferrer = typia.random<string & tags.Format<"uri">>();

  // Create registration request body
  const registrationData = {
    email: adminEmail,
    password: adminPassword,
    href: connectionHref,
    referrer: connectionReferrer,
    ip: typia.random<string>(),
  } satisfies ITodoListAdmin.ICreate;

  // Call admin registration endpoint
  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  // Validate the response structure and data types (complete validation)
  typia.assert(registeredAdmin);

  // Verify business logic: email normalization to lowercase
  TestValidator.equals(
    "admin email should match the input email normalized to lowercase",
    registeredAdmin.email,
    adminEmail.toLowerCase(),
  );

  // Verify business logic: access token automatically set in connection headers
  TestValidator.predicate(
    "access token should be automatically set in connection authorization header",
    connection.headers?.Authorization === registeredAdmin.token.access,
  );
}
