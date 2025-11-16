import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdmin";
import type { ITodoAppTodoAdminRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoAdminRefresh";

export async function test_api_todoadmin_refresh_success(
  connection: api.IConnection,
) {
  // 1. Prepare a structurally valid refresh request body.
  const requestBody = typia.random<ITodoAppTodoAdminRefresh.IRequest>();

  // 2. Call the refresh endpoint with the generated refresh token.
  const authorized: ITodoAppTodoAdmin.IAuthorized =
    await api.functional.auth.todoAdmin.refresh(connection, {
      body: requestBody,
    });

  // 3. Assert the structural type of the response using typia.
  typia.assert<ITodoAppTodoAdmin.IAuthorized>(authorized);

  // 4. Basic business sanity checks on identity fields.
  TestValidator.predicate(
    "todoAdmin id must be a non-empty string",
    typeof authorized.id === "string" && authorized.id.length > 0,
  );

  TestValidator.predicate(
    "todoAdmin email must be a non-empty string",
    typeof authorized.email === "string" && authorized.email.length > 0,
  );

  TestValidator.predicate(
    "todoAdmin status must be a non-empty string",
    typeof authorized.status === "string" && authorized.status.length > 0,
  );

  // 5. Validate token bundle semantics.
  const token: IAuthorizationToken = authorized.token;
  TestValidator.predicate(
    "access token must be a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token must be a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  // 6. Ensure token expiry timestamps are in the future.
  const now = Date.now();
  const expiredAtTime = new Date(token.expired_at).getTime();
  const refreshableUntilTime = new Date(token.refreshable_until).getTime();

  TestValidator.predicate(
    "expired_at must be a valid future datetime",
    Number.isFinite(expiredAtTime) && expiredAtTime > now,
  );

  TestValidator.predicate(
    "refreshable_until must be a valid future datetime",
    Number.isFinite(refreshableUntilTime) && refreshableUntilTime > now,
  );
}
