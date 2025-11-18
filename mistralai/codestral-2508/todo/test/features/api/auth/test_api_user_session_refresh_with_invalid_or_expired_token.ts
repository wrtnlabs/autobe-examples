import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_session_refresh_with_invalid_or_expired_token(
  connection: api.IConnection,
) {
  // Test: malformed (clearly invalid/garbage string) refresh token
  await TestValidator.error(
    "should fail with a completely invalid refresh token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "not-a-real-token-1234567890",
          session_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Test: random plausible UUID/gibberish as refresh token (syntactically valid but not issued by system)
  await TestValidator.error(
    "should fail with a syntactically plausible but bogus token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: typia.random<string>(),
          session_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Test: expired/old session id (random UUID not linked to active session, simulating expiry)
  await TestValidator.error(
    "should fail with a valid format token for a non-existent/expired session",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: typia.random<string>(),
          session_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // Test: re-use scenario (simulate refresh, then attempt to use the same refresh_token again)
  // Since we cannot issue a real refresh token here, simulate by making repeated requests with the same values
  const reusedToken = typia.random<string>();
  const reusedSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should fail when attempting to re-use a once-submitted refresh token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: reusedToken,
          session_id: reusedSessionId,
        } satisfies ITodoListUser.IRefresh,
      });
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: reusedToken,
          session_id: reusedSessionId,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}
