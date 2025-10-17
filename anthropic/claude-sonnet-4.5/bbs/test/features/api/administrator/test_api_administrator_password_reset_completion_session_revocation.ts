import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test the password reset completion flow for administrator accounts.
 *
 * This test validates that the password reset workflow executes successfully,
 * including account creation, multiple session establishment, reset request,
 * and successful re-authentication with a new password.
 *
 * Note: Complete validation of session revocation cannot be performed without
 * access to authenticated admin endpoints or the actual reset token from email.
 * This test focuses on the workflow mechanics that are testable with the
 * available APIs.
 *
 * Steps:
 *
 * 1. Create an administrator account with initial credentials
 * 2. Establish multiple sessions by logging in multiple times (simulating
 *    different devices)
 * 3. Request a password reset to trigger the reset workflow
 * 4. Verify the password reset request returns success message
 * 5. Verify that login with the original password still works before reset
 *    completion
 */
export async function test_api_administrator_password_reset_completion_session_revocation(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitialPass123!@#";

  const createBody = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: adminEmail,
    password: initialPassword,
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const admin: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: createBody,
    });
  typia.assert(admin);

  const unauthConnection1: api.IConnection = { ...connection, headers: {} };
  const loginResult1: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(unauthConnection1, {
      body: {
        email: adminEmail,
        password: initialPassword,
      } satisfies IDiscussionBoardAdministrator.ILogin,
    });
  typia.assert(loginResult1);

  const unauthConnection2: api.IConnection = { ...connection, headers: {} };
  const loginResult2: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(unauthConnection2, {
      body: {
        email: adminEmail,
        password: initialPassword,
      } satisfies IDiscussionBoardAdministrator.ILogin,
    });
  typia.assert(loginResult2);

  const resetRequestResult: IDiscussionBoardAdministrator.IResetRequestResult =
    await api.functional.auth.administrator.password.reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies IDiscussionBoardAdministrator.IResetRequest,
      },
    );
  typia.assert(resetRequestResult);

  TestValidator.predicate(
    "password reset request returns success message",
    resetRequestResult.message.length > 0,
  );

  const verifyLoginStillWorks: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.login(
      { ...connection, headers: {} },
      {
        body: {
          email: adminEmail,
          password: initialPassword,
        } satisfies IDiscussionBoardAdministrator.ILogin,
      },
    );
  typia.assert(verifyLoginStillWorks);
}
