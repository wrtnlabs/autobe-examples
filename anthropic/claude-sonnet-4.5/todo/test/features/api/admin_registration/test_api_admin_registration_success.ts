import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test successful administrator account registration and authentication token
 * issuance.
 *
 * This test validates the complete admin registration workflow including:
 *
 * 1. Admin account creation with valid credentials
 * 2. Secure password hashing (verified indirectly through successful creation)
 * 3. JWT token issuance (access and refresh tokens)
 * 4. Proper response structure with admin account details
 * 5. Automatic authentication header management
 *
 * The test ensures that a new administrator can successfully register in the
 * system, receive proper authentication tokens, and be ready for immediate
 * system access.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // Step 1: Prepare admin registration data with valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const currentPageUrl = typia.random<string & tags.Format<"uri">>();
  const referrerUrl = typia.random<string & tags.Format<"uri">>();

  const registrationData = {
    email: adminEmail,
    password: adminPassword,
    href: currentPageUrl,
    referrer: referrerUrl,
  } satisfies ITodoListAdmin.ICreate;

  // Step 2: Execute admin registration
  const registeredAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate response structure with complete type checking
  typia.assert(registeredAdmin);

  // Step 4: Validate business logic - email matches input
  TestValidator.equals(
    "registered admin email matches input email",
    registeredAdmin.email,
    adminEmail,
  );

  // Step 5: Validate account is active (not soft-deleted)
  TestValidator.equals(
    "newly registered admin account should not be deleted",
    registeredAdmin.deleted_at,
    null,
  );

  // Step 6: Verify connection headers have been updated with access token
  TestValidator.predicate(
    "connection should be authenticated with access token",
    connection.headers?.Authorization === registeredAdmin.token.access,
  );
}
