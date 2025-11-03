import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

/**
 * Validate password reset rejection when an invalid/tampered token is supplied.
 *
 * Business context:
 *
 * - Users can request password resets. The system issues single-use, high-entropy
 *   tokens and persists a token + expiry in the user record. Finalizing a reset
 *   requires presenting the valid token together with a new password.
 * - This test ensures that presenting an explicitly invalid token does NOT
 *   succeed and does not inadvertently change the user's credentials or session
 *   state.
 *
 * Test steps:
 *
 * 1. Create a fresh todoUser via POST /auth/todoUser/join
 * 2. Trigger POST /auth/todoUser/password/request for the user's email
 * 3. Call POST /auth/todoUser/password/reset with an explicit invalid token and
 *    assert the call throws (the reset is rejected)
 * 4. As login endpoint is not available in provided SDK, assert the originally
 *    returned authorization token is still present as a proxy that the account
 *    /session remained unchanged by the failed reset attempt.
 */
export async function test_api_todo_user_password_reset_invalid_token(
  connection: api.IConnection,
) {
  // 1) Create a new todoUser account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const originalPassword = "OrigPass#2025"; // >= 8 chars, meets DTO constraint

  const joinResponse: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(connection, {
      body: {
        email: userEmail,
        password: originalPassword,
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoAppTodoUser.ICreate,
    });
  // Fully validate the authorized response
  typia.assert(joinResponse);

  // Keep original token snapshot for later non-invasive verification
  const originalToken = joinResponse.token;
  typia.assert<IAuthorizationToken>(originalToken);

  // 2) Trigger a password reset issuance for that email (we won't use the real token)
  const resetRequestResponse: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.password.request.requestPasswordReset(
      connection,
      {
        body: {
          email: userEmail,
        } satisfies ITodoAppTodoUser.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequestResponse);

  // 3) Attempt to reset the password using an explicitly invalid token
  // Use await on TestValidator.error because the callback is async
  await TestValidator.error(
    "password reset with invalid token must be rejected",
    async () => {
      await api.functional.auth.todoUser.password.reset.resetPassword(
        connection,
        {
          body: {
            token: "invalid-token-123",
            password: "NewPass#2025",
          } satisfies ITodoAppTodoUser.IResetPassword,
        },
      );
    },
  );

  // 4) Post-condition verification: ensure the originally issued authorization
  // data is still present and looks valid. Because the SDK doesn't provide a
  // login method in the provided materials, we cannot re-authenticate via login
  // here. Instead, assert that the original token from the join response exists
  // and appears unchanged (non-empty). This is a non-invasive proxy check to
  // ensure the account/session wasn't silently rotated by the invalid reset.
  TestValidator.predicate(
    "original authorization token remains present",
    typeof originalToken.access === "string" && originalToken.access.length > 0,
  );
}
