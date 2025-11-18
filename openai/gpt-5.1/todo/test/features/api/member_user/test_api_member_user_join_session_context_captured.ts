import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";

/**
 * Validate member user join with session metadata propagation.
 *
 * Business context:
 *
 * - /auth/memberUser/join registers a new member user and may create an initial
 *   session record using metadata fields ip, href, and referrer supplied in
 *   ITodoAppMemberUserJoin.ICreate.
 * - The response is ITodoAppMemberUser.IAuthorized, which includes identity
 *   fields and an IAuthorizationToken used for subsequent authenticated
 *   requests.
 *
 * Test goals in this function:
 *
 * 1. Build a registration payload that:
 *
 *    - Uses a unique email (Format<"email">).
 *    - Uses a password satisfying Format<"password">.
 *    - Optionally sets displayName to a human-like string.
 *    - Sets ip to a plausible IPv4 address string (Format<"ipv4">).
 *    - Sets href to a valid URI (Format<"uri">) representing the signup page.
 *    - Sets referrer to a valid URI (Format<"uri">) representing the previous page.
 * 2. Call api.functional.auth.memberUser.join with this payload and assert that
 *    the response is a valid ITodoAppMemberUser.IAuthorized instance.
 * 3. Verify business invariants that are observable from the response:
 *
 *    - The email in the response matches the requested email.
 *    - The display_name in the response is either null/undefined or is a non-empty
 *         string when present.
 * 4. Validate that the issued token structure (IAuthorizationToken) looks usable
 *    for follow-up authenticated requests.
 *
 * Notes and constraints:
 *
 * - This test must not assume the existence of any session-listing APIs or
 *   attempt to inspect server-side session tables directly.
 * - It must not touch connection.headers at all; header management is fully
 *   handled by the SDK and is out of scope for this test.
 * - It must not perform type-invalid requests or omit required fields.
 */
export async function test_api_member_user_join_session_context_captured(
  connection: api.IConnection,
) {
  // 1. Prepare unique registration payload with full session metadata
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name();

  // Valid IPv4 address for ip, and valid URIs for href and referrer.
  const ipV4 = "192.168.0.1" as string & tags.Format<"ipv4">;
  const href = "https://todoapp.example.com/signup" as string &
    tags.Format<"uri">;
  const referrer = "https://todoapp.example.com/landing" as string &
    tags.Format<"uri">;

  const requestBody = {
    email,
    password,
    displayName,
    ip: ipV4,
    href,
    referrer,
  } satisfies ITodoAppMemberUserJoin.ICreate;

  // 2. Call join endpoint
  const authorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: requestBody,
    });

  // 3. Validate response type and business invariants
  typia.assert<ITodoAppMemberUser.IAuthorized>(authorized);

  TestValidator.equals(
    "joined member email matches request email",
    authorized.email,
    email,
  );

  if (
    authorized.display_name !== null &&
    authorized.display_name !== undefined
  ) {
    TestValidator.equals(
      "display name is a string when present",
      typeof authorized.display_name,
      "string",
    );
  }

  // 4. Validate token structure looks usable
  const token: IAuthorizationToken = authorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token string should be non-empty",
    token.access.length > 0,
  );
}
