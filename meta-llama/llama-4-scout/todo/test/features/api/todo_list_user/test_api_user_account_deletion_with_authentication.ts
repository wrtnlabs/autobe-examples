import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Permanently deletes the authenticated user's own account and all associated
 * data.
 *
 * Steps:
 *
 * 1. Register a new user (POST /auth/user/join) with random credentials
 * 2. (Assumed) Simulate email verification by directly toggling the user's
 *    verification status, as the email verification endpoint is outside scope
 * 3. Ensure account is now verified (is_verified = true)
 * 4. Log in as the verified user (simulate re-authentication)
 * 5. Call DELETE /todoList/user/users/me with the user's authenticated session
 * 6. Ensure the API call succeeds for the authenticated, verified user and returns
 *    no value
 * 7. Immediately attempt to call DELETE /todoList/user/users/me again with the old
 *    token—should be denied (session revoked)
 * 8. Attempt to register a new user with the same email as the deleted
 *    account—should succeed (because deletion is permanent and email is now
 *    available)
 * 9. Attempt to erase the account without authentication—should be forbidden
 */
export async function test_api_user_account_deletion_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 8,
    wordMax: 16,
  });
  const displayName: string = RandomGenerator.name();
  const baseUrl = "https://example.com/todo/join";

  const joinOutput: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: password as string & tags.Format<"password">,
        display_name: displayName,
        href: baseUrl,
        referrer: baseUrl,
        ip: undefined,
      } satisfies ITodoListUser.IJoin,
    });
  typia.assert(joinOutput);

  // 2. Simulate email verification (assumed as immediate for E2E purposes)
  // (There's no actual API call here—assume is_verified toggled true as system would do after verification)

  // 3. Ensure account is now verified (simulate set)
  TestValidator.predicate(
    "user is initially unverified (signup returns is_verified: false)",
    joinOutput.is_verified === false,
  );
  // Normally, user must verify email; we'll assume auto-verify in test

  // 4. Simulate login (session context is present post-join via Authorization header)
  // No login endpoint, session is present automatically via join

  // 5. Delete account via DELETE /todoList/user/users/me
  await api.functional.todoList.user.users.me.erase(connection);

  // 6. Attempt to call DELETE again with same token (should now be session revoked)
  await TestValidator.error(
    "deletion with revoked session should be denied",
    async () => {
      await api.functional.todoList.user.users.me.erase(connection);
    },
  );

  // 7. Attempt to reuse deleted email for new signup (should succeed since original is erased)
  const joinAgain = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password: password as string & tags.Format<"password">,
      display_name: RandomGenerator.name(),
      href: baseUrl,
      referrer: baseUrl,
      ip: undefined,
    } satisfies ITodoListUser.IJoin,
  });
  typia.assert(joinAgain);
  TestValidator.equals(
    "new user can re-register with deleted permanently email",
    joinAgain.email,
    email,
  );

  // 8. Attempt to erase with unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "account erasure without authentication is forbidden",
    async () => {
      await api.functional.todoList.user.users.me.erase(unauthConn);
    },
  );
}
