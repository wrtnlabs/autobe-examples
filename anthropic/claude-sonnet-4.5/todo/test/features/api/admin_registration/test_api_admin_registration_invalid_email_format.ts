import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Test admin registration with business logic validation.
 *
 * NOTE: The original test scenario requested validation of invalid email
 * formats, which is type validation and not business logic testing. Type
 * validation is enforced by TypeScript compilation and the typia validation
 * framework, not by E2E tests.
 *
 * Instead, this test validates the successful registration flow with valid
 * data, ensuring the admin registration endpoint works correctly with proper
 * inputs.
 *
 * Test workflow:
 *
 * 1. Generate valid admin registration data
 * 2. Attempt to register a new admin account
 * 3. Verify successful registration with returned authorization tokens
 * 4. Validate the response structure matches expected types
 */
export async function test_api_admin_registration_invalid_email_format(
  connection: api.IConnection,
) {
  // Since testing invalid email formats is type validation (prohibited),
  // we test the valid registration flow instead to ensure the endpoint works
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string>(),
  } satisfies ITodoListAdmin.ICreate;

  const result = await api.functional.auth.admin.join(connection, {
    body: registrationData,
  });

  typia.assert(result);

  // Validate the response contains expected admin data
  TestValidator.equals(
    "registered email matches input",
    result.email,
    registrationData.email,
  );

  TestValidator.predicate(
    "authorization token is provided",
    result.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is provided",
    result.token.refresh.length > 0,
  );
}
