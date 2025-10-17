import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test guest user registration to create a temporary guest session with JWT
 * tokens for unauthenticated browsing on the shopping mall platform.
 *
 * Validates that a new guest user can successfully join without providing
 * credentials and receives valid JWT tokens and session details.
 *
 * Confirms no authentication is required and the session token, IP address, and
 * user agent are properly registered.
 *
 * Expects a successful response containing the guest authorization information
 * for subsequent guest operations.
 */
export async function test_api_guest_registration_new_session(
  connection: api.IConnection,
) {
  // Generate guest session creation payload
  const requestBody = {
    session_token: RandomGenerator.alphaNumeric(16), // Unique session token
    ip_address: `${typia.random<string & tags.Format<"ipv4">>()}`, // Valid IPv4 format
    user_agent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${RandomGenerator.alphaNumeric(2)}.0.0.0 Safari/537.36`,
  } satisfies IShoppingMallGuest.ICreate;

  // Call the guest join API
  const output: IShoppingMallGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: requestBody });

  // Validate the output response structure and types
  typia.assert(output);

  // Validate business logic - session_token matches
  TestValidator.equals(
    "returned session_token should match request",
    output.session_token,
    requestBody.session_token,
  );

  // Validate token fields present
  TestValidator.predicate(
    "access token should be non-empty",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    output.token.refresh.length > 0,
  );

  // Validate IP address and user agent matches or are null
  TestValidator.equals(
    "returned IP address matches request",
    output.ip_address ?? null,
    requestBody.ip_address ?? null,
  );

  TestValidator.equals(
    "returned user agent matches request",
    output.user_agent ?? null,
    requestBody.user_agent ?? null,
  );
}
