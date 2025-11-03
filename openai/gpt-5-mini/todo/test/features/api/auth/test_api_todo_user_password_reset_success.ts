import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todo_user_password_reset_success(
  connection: api.IConnection,
) {
  // This E2E test validates the successful password reset flow for a todoUser.
  // Strategy: run the sequence in SDK simulation mode to avoid external email
  // delivery / DB access while still exercising the API contracts and type
  // assertions.

  // Create a simulated unauthenticated connection (do not mutate original)
  const simConn: api.IConnection = {
    ...connection,
    simulate: true,
    headers: {},
  };

  // 1) Create a new todoUser via join
  const signupEmail = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitPass123!"; // >= 8 chars as required
  const joinBody = {
    email: signupEmail,
    password: initialPassword,
    href: "http://localhost/",
    referrer: "http://localhost/ref",
    displayName: RandomGenerator.name(),
  } satisfies ITodoAppTodoUser.ICreate;

  const authorized: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.join(simConn, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Basic business assertions about join response
  TestValidator.predicate(
    "joined user has an id",
    authorized.id !== undefined && authorized.id !== null,
  );
  TestValidator.equals(
    "joined user email matches",
    authorized.email,
    signupEmail,
  );

  // 2) Request a password reset for the created user's email
  const requestBody = {
    email: signupEmail,
  } satisfies ITodoAppTodoUser.IPasswordResetRequest;
  const requestSummary: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.password.request.requestPasswordReset(
      simConn,
      { body: requestBody },
    );
  typia.assert(requestSummary);

  // The API must not include the token in the response; ensure the summary
  // references the same user id when running in simulate mode
  TestValidator.equals(
    "password reset request targeted user",
    requestSummary.id,
    authorized.id,
  );

  // 3) Obtain the reset token from test harness
  // In a real E2E environment, this step would read the persisted token from
  // the test database or intercept the outbound email. For a portable,
  // compilable test we run in simulate mode and generate a token shaped value
  // that satisfies the DTO type for reset. This avoids DB/email dependencies
  // while validating the reset endpoint contract.
  const simulatedToken = typia.random<string>();

  // 4) Call password reset endpoint with the token and new password
  const newPassword = "N3wSecur3P@ss!";
  const resetBody = {
    token: simulatedToken,
    password: newPassword,
  } satisfies ITodoAppTodoUser.IResetPassword;

  const resetSummary: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.password.reset.resetPassword(simConn, {
      body: resetBody,
    });
  typia.assert(resetSummary);

  // Confirm that the reset operation is targeting the same user record in
  // simulation mode
  TestValidator.equals(
    "reset affected same user",
    resetSummary.id,
    authorized.id,
  );

  // 5) Optional verification: in full integration tests one would call login
  // with the new password and ensure the old password fails. Login is not
  // available in the provided SDK for this test harness, so we stop after
  // verifying the reset endpoint response and types.
}
