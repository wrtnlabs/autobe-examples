import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

export async function test_api_admin_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new administrator using /auth/admin/join
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ITodoListAdmin.ICreate;

  const joinResponse: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(joinResponse);

  // 2. Use the refresh token from joinResponse.token.refresh to refresh tokens
  const refreshBody = {
    refreshToken: joinResponse.token.refresh,
  } satisfies ITodoListAdmin.IRefresh;

  const refreshResponse: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshResponse);

  // 3. Validate that new tokens are received
  TestValidator.predicate(
    "New access token is a non-empty string",
    typeof refreshResponse.token.access === "string" &&
      refreshResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "New refresh token is a non-empty string",
    typeof refreshResponse.token.refresh === "string" &&
      refreshResponse.token.refresh.length > 0,
  );

  // 4. Validate consistency of administrator id and email
  TestValidator.equals(
    "Administrator ID should remain the same after refresh",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "Administrator email should remain the same after refresh",
    refreshResponse.email,
    joinResponse.email,
  );
}
