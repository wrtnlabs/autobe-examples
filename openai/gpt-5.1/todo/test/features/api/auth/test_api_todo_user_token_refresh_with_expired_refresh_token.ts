import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import type { ITodoAppTodoUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUserRefresh";

export async function test_api_todo_user_token_refresh_with_expired_refresh_token(
  connection: api.IConnection,
) {
  // In this test, we want to verify that the todoUser refresh endpoint does
  // not issue new authorization tokens when given an expired (or otherwise
  // invalid) refresh token.
  //
  // However, the provided SDK surface for this test file only exposes the
  // refresh endpoint, not the join/login flows that would allow us to mint a
  // real refresh token and then wait for it to expire. Also, the Nestia
  // simulation mode simply returns random authorized payloads regardless of the
  // logical validity of the token. Therefore, we implement the following
  // strategy:
  //
  // - If `connection.simulate === true`, we cannot assert backend error
  //   semantics because `refresh.simulate` always succeeds. In that case, we
  //   simply mark the test as effectively skipped via a trivial predicate and
  //   return.
  // - If `connection.simulate !== true`, we treat a clearly bogus token string
  //   as an "expired or invalid" refresh token from the backend's perspective.
  //   The backend should reject it with an authorization error (e.g., HttpError)
  //   and must not return an `ITodoAppTodoUser.IAuthorized` payload.
  //
  // The test performs two separate refresh attempts using the same bogus token
  // and asserts that both attempts fail, demonstrating deterministic handling of
  // invalid/expired refresh tokens.

  // When running in simulate mode, the SDK mock always returns a successful
  // ITodoAppTodoUser.IAuthorized, so we cannot test negative behavior. In this
  // mode, soft-skip the test with a simple predicate.
  if (connection.simulate === true) {
    TestValidator.predicate(
      "skip expired refresh token negative test in simulate mode",
      true,
    );
    return;
  }

  // Prepare a clearly invalid/expired-like refresh token. Any token that was
  // never issued by the backend should be treated similarly to an expired token
  // by the refresh logic (i.e., rejected), which is sufficient to validate the
  // contract that expired/invalid tokens cannot be used to obtain new
  // authorization.
  const body = {
    refreshToken: `expired-${RandomGenerator.alphaNumeric(32)}`,
  } satisfies ITodoAppTodoUserRefresh.IRequest;

  // 1st attempt: the expired/invalid token must cause the refresh call to
  // fail. We only assert that some error is thrown, without checking status
  // codes or error messages.
  await TestValidator.error(
    "first expired refresh token attempt should fail",
    async () => {
      await api.functional.auth.todoUser.refresh(connection, { body });
    },
  );

  // 2nd attempt: retrying with the same token must also fail, demonstrating
  // deterministic handling (no accidental recovery or token issuance).
  await TestValidator.error(
    "second expired refresh token attempt should also fail",
    async () => {
      await api.functional.auth.todoUser.refresh(connection, { body });
    },
  );
}
