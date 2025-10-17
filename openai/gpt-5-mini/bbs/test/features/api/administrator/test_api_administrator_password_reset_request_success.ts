import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_administrator_password_reset_request_success(
  connection: api.IConnection,
) {
  /**
   * Test: Administrator password reset request (successful acknowledgement).
   *
   * Steps:
   *
   * 1. Create a new administrator account via POST /auth/administrator/join
   * 2. Call POST /auth/administrator/password/reset with that account email
   * 3. Assert response DTO shape and business-level rules (generic
   *    acknowledgement)
   *
   * Notes:
   *
   * - The SDK's join implementation injects the returned access token into
   *   `connection.headers.Authorization`. The password reset endpoint is public
   *   by design; this test uses the same connection (authenticated) but the
   *   endpoint should still behave as a public reset-request endpoint.
   * - DB / audit log verification is OUT OF SCOPE for this test because no read
   *   APIs are provided in the SDK. The test harness must verify those
   *   side-effects directly against the test database or via admin utilities.
   */

  // 1) Create administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "Passw0rd!!", // 10 characters, satisfies MinLength<10>
    username: RandomGenerator.name(1),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const adminAuth: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IEconPoliticalForumAdministrator.IAuthorized>(adminAuth);

  TestValidator.predicate(
    "admin auth contains access token",
    typeof adminAuth.token?.access === "string" &&
      adminAuth.token.access.length > 0,
  );

  // 2) Request password reset
  const resetRequestBody = {
    email: adminEmail,
  } satisfies IEconPoliticalForumAdministrator.IRequestPasswordReset;

  const resetResponse: IEconPoliticalForumAdministrator.IResetRequestResponse =
    await api.functional.auth.administrator.password.reset.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IEconPoliticalForumAdministrator.IResetRequestResponse>(
    resetResponse,
  );

  // 3) Business assertions
  TestValidator.predicate(
    "reset request acknowledged (success true)",
    resetResponse.success === true,
  );

  TestValidator.predicate(
    "reset request contains non-empty message",
    typeof resetResponse.message === "string" &&
      resetResponse.message.length > 0,
  );

  // Prefer canonical generic phrase when available. If not present, ensure
  // message does not contain explicit account-denying phrases.
  const canonicalPhrase = /if an account exists for the provided email/i;
  const negativePhrase = /no account|not found|does not exist/i;

  TestValidator.predicate(
    "reset message is generic (no explicit enumeration)",
    canonicalPhrase.test(resetResponse.message) ||
      !negativePhrase.test(resetResponse.message),
  );

  // If server returned a request_id (correlation UUID), validate its format.
  if (resetResponse.request_id !== undefined) {
    // Assert it's a UUID format string
    typia.assert<string & tags.Format<"uuid">>(resetResponse.request_id);
    TestValidator.predicate(
      "request_id is non-empty UUID",
      typeof resetResponse.request_id === "string" &&
        resetResponse.request_id.length > 0,
    );
  }

  // 4) Side-effect verification note (must be performed by test harness):
  // - Verify a password_resets row was created with non-null reset_token_hash,
  //   expires_at (near-term), used === false, and registereduser_id references
  //   the created admin. Verify an audit log entry exists for the request.

  // 5) Teardown requirement:
  // - Remove created test artifacts (administrator account, password reset rows,
  //   audit logs) via DB fixtures or admin utilities. This test does not perform
  //   deletion because corresponding SDK endpoints are not provided.
}
