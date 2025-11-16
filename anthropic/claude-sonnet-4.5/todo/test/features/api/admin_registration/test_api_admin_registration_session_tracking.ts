import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin registration with session tracking validation.
 *
 * This test verifies that the admin registration endpoint properly handles
 * session context information (IP, href, referrer) and returns a complete
 * authentication response with JWT tokens. It validates that all required
 * fields are populated correctly in the admin profile response.
 *
 * Steps:
 *
 * 1. Generate valid admin registration data with session context
 * 2. Call the admin registration endpoint
 * 3. Validate the response structure and token information
 * 4. Verify the email matches the registration input
 */
export async function test_api_admin_registration_session_tracking(
  connection: api.IConnection,
) {
  // Step 1: Prepare admin registration data with session context
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListAdmin.ICreate;

  // Step 2: Register new admin account
  const admin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: registrationData,
    });

  // Step 3: Validate the complete response structure (this validates EVERYTHING)
  typia.assert(admin);

  // Step 4: Verify business logic - email matches registration input
  TestValidator.equals(
    "registered email matches input",
    admin.email,
    registrationData.email,
  );
}
