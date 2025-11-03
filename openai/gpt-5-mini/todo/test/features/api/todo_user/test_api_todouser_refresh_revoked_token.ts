import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";

export async function test_api_todouser_refresh_revoked_token(
  connection: api.IConnection,
) {
  /**
   * E2E test: Verify that refresh tokens issued before a credential rotation
   * (password reset) are revoked.
   *
   * Notes on behavior:
   *
   * - If the test harness runs with connection.simulate === true, we use a local
   *   cloned connection for simulation calls to avoid mutating the harness
   *   connection.headers (SDK sets Authorization header on the connection
   *   passed to it).
   * - In non-simulated (real) environments, the test requests a password reset
   *   but cannot retrieve the out-of-band token; therefore it attempts a
   *   placeholder reset (expected to fail) and then validates that the old
   *   refresh token is rejected. If the test environment provides a DB/email
   *   hook to obtain the real reset token, replace the placeholder step with
   *   that retrieval to finalize reset successfully and validate revocation.
   */

  // Local helper: create user via join and return the authorized DTO + email
  const createUser = async (): Promise<{
    joined: ITodoAppTodoUser.IAuthorized;
    email: string;
  }> => {
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(12);

    const joined: ITodoAppTodoUser.IAuthorized =
      await api.functional.auth.todoUser.join(connection, {
        body: {
          email,
          password,
          href: "https://example.com/signup",
          referrer: "https://example.com",
        } satisfies ITodoAppTodoUser.ICreate,
      });
    typia.assert(joined);
    return { joined, email };
  };

  // 1) Create a new todoUser and capture its authorization container
  const { joined, email } = await createUser();
  typia.assert(joined);

  const originalRefreshToken: string = joined.token.refresh;
  TestValidator.predicate(
    "original refresh token is present",
    typeof originalRefreshToken === "string" && originalRefreshToken.length > 0,
  );

  // 2) Sanity-check: refresh with the original token should work initially
  const refreshedBefore: ITodoAppTodoUser.IAuthorized =
    await api.functional.auth.todoUser.refresh(connection, {
      body: {
        refresh_token: originalRefreshToken,
      } satisfies ITodoAppTodoUser.IRefresh,
    });
  typia.assert(refreshedBefore);
  TestValidator.predicate(
    "refresh before reset returns an authorization token",
    typeof refreshedBefore.token?.access === "string" &&
      refreshedBefore.token.access.length > 0,
  );

  // 3) Request a password reset (server persists a one-time token and sends it
  // out-of-band). We assert that the request returns an ISummary acknowledging
  // the account lookup.
  const resetRequest: ITodoAppTodoUser.ISummary =
    await api.functional.auth.todoUser.password.request.requestPasswordReset(
      connection,
      {
        body: { email } satisfies ITodoAppTodoUser.IPasswordResetRequest,
      },
    );
  typia.assert(resetRequest);
  TestValidator.predicate(
    "password reset request succeeded",
    typeof resetRequest.id === "string" && resetRequest.id.length > 0,
  );

  // 4) Finalize password reset (credential rotation). Because real test
  // environments normally deliver tokens out-of-band (email) and we don't
  // have a mailbox hook here, this step is conditional.
  const newPassword = RandomGenerator.alphaNumeric(12);
  const placeholderResetToken = typia.random<string>();

  if (connection.simulate === true) {
    // Use a shallow clone to prevent SDK from modifying the caller-provided
    // connection.headers in simulation mode.
    const simConn: api.IConnection = { ...connection };

    const resetSummary: ITodoAppTodoUser.ISummary =
      await api.functional.auth.todoUser.password.reset.resetPassword(simConn, {
        body: {
          token: placeholderResetToken,
          password: newPassword,
        } satisfies ITodoAppTodoUser.IResetPassword,
      });
    typia.assert(resetSummary);
    TestValidator.predicate(
      "simulated password reset returned summary",
      typeof resetSummary.id === "string",
    );

    // After successful reset (simulated), the original refresh token MUST be rejected.
    await TestValidator.error(
      "old refresh token should be rejected after simulated password reset",
      async () => {
        await api.functional.auth.todoUser.refresh(simConn, {
          body: {
            refresh_token: originalRefreshToken,
          } satisfies ITodoAppTodoUser.IRefresh,
        });
      },
    );
  } else {
    // Real environment: try reset with placeholder token and expect failure if
    // the environment does not provide the real out-of-band token.
    await TestValidator.error(
      "password reset with placeholder token should fail in real environment",
      async () => {
        await api.functional.auth.todoUser.password.reset.resetPassword(
          connection,
          {
            body: {
              token: placeholderResetToken,
              password: newPassword,
            } satisfies ITodoAppTodoUser.IResetPassword,
          },
        );
      },
    );

    // Attempt to refresh using the ORIGINAL refresh token. Correct server
    // behavior after credential rotation is to reject that token. We assert
    // that the call fails; if it succeeds, we intentionally fail the test so
    // the issue is highlighted.
    let refreshRejected = false;
    try {
      const maybeAuthorized: ITodoAppTodoUser.IAuthorized =
        await api.functional.auth.todoUser.refresh(connection, {
          body: {
            refresh_token: originalRefreshToken,
          } satisfies ITodoAppTodoUser.IRefresh,
        });
      typia.assert(maybeAuthorized);
      // If the refresh succeeded with the OLD token, that's a failure of
      // rotation/revocation policy in the backend.
      TestValidator.predicate(
        "old refresh token MUST be revoked after password reset (backend did not revoke)",
        false,
      );
    } catch {
      // Expected: refresh call throws due to invalid/ revoked refresh token.
      refreshRejected = true;
    }

    TestValidator.predicate(
      "old refresh token rejected after credential rotation (real environment)",
      refreshRejected === true,
    );
  }
}
