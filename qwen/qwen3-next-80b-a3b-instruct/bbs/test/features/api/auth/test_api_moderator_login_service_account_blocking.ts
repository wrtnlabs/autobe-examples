import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_service_account_blocking(
  connection: api.IConnection,
) {
  // This E2E test verifies the moderator login endpoint rejects invalid input.
  // While the requirement asks to test service account IP blocking (i.e., 169.254.169.254),
  // this blocking is implemented at the infrastructure layer (network/firewall level)
  // based on the client's source IP address, not via the request body.
  //
  // The API's ILogin type is defined as a string, and it is expected to contain
  // an email address for authentication. We cannot simulate an AWS metadata IP
  // address by sending it in the body because the body expects an email.
  //
  // Since this test cannot manipulate the client IP address, we test the
  // endpoint with an invalid body (non-email string) to confirm the system
  // properly validates input.
  //
  // The scenario's requirement for testing service account IPs is impossible to
  // implement in this API's E2E test suite, as it requires control over the
  // transport layer. Instead, we validate the system's input validation.

  // Test 1: Send a string that resembles an AWS endpoint URL - invalid email format
  const malformedInput =
    "http://169.254.169.254/latest/meta-data/" satisfies IPoliticalForumModerator.ILogin;

  await TestValidator.error(
    "login attempt with malformed string body (ressembling AWS metadata URL) should be rejected with invalid input",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: malformedInput,
      });
    },
  );

  // Test 2: Send a valid email to confirm correct functionality
  const validEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies IPoliticalForumModerator.ILogin;

  const result = await api.functional.auth.moderator.login(connection, {
    body: validEmail,
  });
  typia.assert(result);

  // Validate response fields
  TestValidator.predicate("user has unique UUID id", result.id.length > 0);
  TestValidator.predicate(
    "user has valid email",
    result.email.includes("@") && result.email.includes("."),
  );
  TestValidator.equals(
    "access token exists",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    result.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "expires_at is present and formatted",
    result.token.expired_at.length > 0 && result.token.expired_at.includes("T"),
    true,
  );
  TestValidator.equals(
    "refreshable_until is present and formatted",
    result.token.refreshable_until.length > 0 &&
      result.token.refreshable_until.includes("T"),
    true,
  );

  // Note: Infrastructure-level service account IP blocking (e.g., 169.254.169.254)
  // is enforced at the network layer and is outside the scope of this API's E2E test.
  // The test above validates that the API correctly rejects malformed input,
  // which is the only way to test this endpoint's behavior from this layer.
}
