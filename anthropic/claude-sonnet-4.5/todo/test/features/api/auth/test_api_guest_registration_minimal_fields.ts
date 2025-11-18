import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test guest registration with only required fields (email, password, href,
 * referrer).
 *
 * Validates that the guest user registration endpoint works correctly when only
 * the mandatory fields are provided, omitting optional fields like name and ip.
 * This test ensures the system handles minimal registration data gracefully and
 * still creates a valid user session with proper JWT authentication tokens.
 *
 * Test Flow:
 *
 * 1. Generate minimal registration data (only required fields)
 * 2. Call guest registration API
 * 3. Validate response contains valid user ID and JWT tokens
 * 4. Verify all token fields are properly formatted
 */
export async function test_api_guest_registration_minimal_fields(
  connection: api.IConnection,
) {
  // Generate minimal registration data with only required fields
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string>(),
    referrer: typia.random<string>(),
  } satisfies ITodoListGuest.ICreate;

  // Call the guest registration API
  const response: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });

  // Validate the response structure and types
  typia.assert(response);
}
