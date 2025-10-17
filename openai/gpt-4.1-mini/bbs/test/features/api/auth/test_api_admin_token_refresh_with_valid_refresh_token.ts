import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

export async function test_api_admin_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin user with proper join payload
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssw0rd123";
  const adminDisplayName = RandomGenerator.name();

  const joinRequest = {
    email: adminEmail,
    password: adminPassword,
    displayName: adminDisplayName,
  } satisfies IDiscussionBoardAdmin.IJoin;

  const joinResponse: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinRequest,
    });
  typia.assert(joinResponse);

  // Step 2: Use the received refresh token to call refresh endpoint
  const refreshRequest = {
    refresh_token: joinResponse.token.refresh,
  } satisfies IDiscussionBoardAdmin.IRefresh;

  const refreshResponse: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.refresh(connection, {
      body: refreshRequest,
    });
  typia.assert(refreshResponse);

  // Step 3: Validate token details
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof refreshResponse.token.access === "string" &&
      refreshResponse.token.access.length > 0,
  );
  TestValidator.equals(
    "refresh token matches original",
    refreshResponse.token.refresh,
    joinResponse.token.refresh,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshResponse.token.expired_at,
  );
  typia.assert<string & tags.Format<"date-time">>(
    refreshResponse.token.refreshable_until,
  );
}
