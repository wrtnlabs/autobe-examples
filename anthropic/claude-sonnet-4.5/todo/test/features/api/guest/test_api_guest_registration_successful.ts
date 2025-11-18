import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test successful guest user registration with all required fields provided.
 *
 * This test validates the complete guest registration flow by submitting a
 * valid registration request with all required fields and verifying that:
 *
 * 1. A new guest user account is created successfully
 * 2. The response contains a valid user ID in UUID format
 * 3. JWT access and refresh tokens are issued immediately
 * 4. Token expiration timestamps are properly set
 * 5. The authentication token is automatically set in connection headers
 *
 * The test ensures that the registration endpoint correctly handles valid
 * input, creates the user record in the database with hashed password,
 * establishes an initial session, and returns proper authentication credentials
 * for immediate use.
 */
export async function test_api_guest_registration_successful(
  connection: api.IConnection,
) {
  // Prepare valid guest registration data with all required fields
  const registrationData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: "192.168.1.100",
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies ITodoListGuest.ICreate;

  // Submit guest registration request
  const authorizedGuest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });

  // Validate the complete response structure and all type requirements
  typia.assert(authorizedGuest);

  // Validate that expired_at is in the future
  const expiredAt = new Date(authorizedGuest.token.expired_at);
  const now = new Date();
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAt > now,
  );

  // Validate that refreshable_until is in the future
  const refreshableUntil = new Date(authorizedGuest.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until should be in the future",
    refreshableUntil > now,
  );

  // Verify connection headers were automatically updated with access token
  TestValidator.predicate(
    "connection headers should contain authorization token",
    connection.headers?.Authorization === authorizedGuest.token.access,
  );
}
