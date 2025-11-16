import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

/**
 * Validate login failure behavior for non-existent member user identifiers.
 *
 * Business intent:
 *
 * - Ensure that POST /auth/memberUser/login rejects authentication when the
 *   supplied identifier (email/username) does not correspond to any existing
 *   member user.
 * - Confirm that such failures are observable only as generic authentication
 *   errors from the client side, without leaking whether the identifier is
 *   unknown, aligning with account-enumeration protections.
 *
 * Test strategy:
 *
 * 1. Prepare a high-entropy, email-like identifier that is extremely unlikely to
 *    exist in the system, and an arbitrary password string.
 * 2. Attempt to log in using api.functional.auth.memberUser.login with those
 *    credentials.
 * 3. Use TestValidator.error with an async closure to assert that the login
 *    operation fails (the SDK must throw for authentication failure).
 * 4. Ensure that no IAuthorized payload is ever produced in this test; any success
 *    path must cause the test to fail explicitly.
 *
 * Notes and constraints:
 *
 * - We must not attempt to read or modify connection.headers directly, per global
 *   rules; header-side effects are implicitly validated by the absence of a
 *   successful login.
 * - We do not and cannot assert DB-level behavior (no session row, presence of
 *   security events), but the test scenario is designed assuming those
 *   side-effects are implemented correctly.
 */
export async function test_api_member_user_login_nonexistent_identifier(
  connection: api.IConnection,
) {
  // Prepare a clearly non-existent identifier: high-entropy email-like value
  const randomLocalPart: string = RandomGenerator.alphaNumeric(24);
  const identifier: string = `${randomLocalPart}@nonexistent-example.test`;

  // Arbitrary password; content does not matter because identifier should not exist
  const password: string = RandomGenerator.alphaNumeric(32);

  // Build the login request body satisfying ILoginRequest.
  const body = {
    identifier,
    password,
    // Optional fields ip, href, and referrer are omitted.
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  // Core assertion: login MUST fail for non-existent identifier.
  await TestValidator.error(
    "login with non-existent identifier must fail",
    async () => {
      // If this call unexpectedly succeeds, we explicitly fail the test by
      // asserting on the impossible success path.
      const authorized = await api.functional.auth.memberUser.login(
        connection,
        {
          body,
        },
      );

      // If we reached here, authentication succeeded unexpectedly, so fail hard
      // by asserting token structure and then throwing.
      typia.assert<IAuthorizationToken>(authorized.token);
      throw new Error(
        "Login unexpectedly succeeded for non-existent identifier",
      );
    },
  );
}
