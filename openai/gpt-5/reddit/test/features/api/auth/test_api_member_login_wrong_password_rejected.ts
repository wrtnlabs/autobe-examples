import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";

/**
 * Reject login when password is wrong for a valid member identifier.
 *
 * Business context:
 *
 * - A member successfully registers (join) and receives an authorized payload.
 * - Using the same identifier (email), a subsequent login attempt with an
 *   incorrect password must fail according to authentication rules.
 *
 * Steps:
 *
 * 1. Join a member with valid inputs (unique email/username, strong password,
 *    consent timestamps).
 * 2. Clone an unauthenticated connection (empty headers) to isolate the login
 *    attempt from the joined session token.
 * 3. Call POST /auth/memberUser/login with the correct email but a wrong password
 *    and expect an error using TestValidator.error.
 * 4. Do not assert status codes or error details; only verify rejection occurred
 *    and that no authorized payload is returned.
 */
export async function test_api_member_login_wrong_password_rejected(
  connection: api.IConnection,
) {
  // 1) Register a real member account for a known identifier (email)
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.alphaNumeric(10); // matches ^[A-Za-z0-9_]{3,20}$
  const joinPassword = "passw0rd1"; // ≥8 chars, includes letters and digits

  const joinBody = {
    email,
    username,
    password: joinPassword,
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: false,
  } satisfies ICommunityPlatformMemberUser.ICreate;

  const joined = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(joined);

  // 2) Prepare an unauthenticated connection to avoid using the joined token
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Attempt login with the correct email but wrong password → expect rejection
  const wrongLoginBody = {
    email,
    password: "Wrong12345",
  } satisfies ICommunityPlatformMemberUser.ILogin;

  await TestValidator.error(
    "login with wrong password is rejected",
    async () => {
      await api.functional.auth.memberUser.login(unauthConn, {
        body: wrongLoginBody,
      });
    },
  );
}
