import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_admin_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Register new admin
  const joinBody = {
    email: `admin${typia.random<string & tags.Format<"email">>()}`,
    password: "P@ssw0rd1234",
    nickname: typia.random<string>(),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // Step 2: Use refresh endpoint with valid refresh token
  const refreshBody = {
    refresh_token: admin.token.refresh,
  } satisfies IDiscussionBoardAdmin.IRefresh;

  const refreshed: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, { body: refreshBody });
  typia.assert(refreshed);

  // Step 3: Validate that new access tokens are different from original
  TestValidator.notEquals(
    "access tokens should be updated",
    refreshed.token.access,
    admin.token.access,
  );

  // Step 4: Validate that refresh tokens remain the same
  TestValidator.equals(
    "refresh tokens should remain same",
    refreshed.token.refresh,
    admin.token.refresh,
  );

  // Step 5: Validate access and refresh tokens are non-empty strings
  TestValidator.predicate(
    "original token access is non-empty",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed token access is non-empty",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "original token refresh is non-empty",
    typeof admin.token.refresh === "string" && admin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed token refresh is non-empty",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  // Step 6: Validate admin properties remain consistent
  TestValidator.equals("admin id remains same", refreshed.id, admin.id);
  TestValidator.equals(
    "admin email remains same",
    refreshed.email,
    admin.email,
  );
  TestValidator.equals(
    "admin nickname remains same",
    refreshed.nickname,
    admin.nickname,
  );
}
