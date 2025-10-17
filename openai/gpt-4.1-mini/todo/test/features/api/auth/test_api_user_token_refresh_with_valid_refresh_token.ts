import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * This test verifies the user token refresh flow by first creating a user
 * account through the join API. It then uses the issued refresh token to call
 * the refresh API endpoint to obtain new access and refresh tokens. The test
 * validates that the tokens returned are well-formed and represent an extended
 * session.
 *
 * Steps:
 *
 * 1. Call POST /auth/user/join to create a new user with a randomly generated
 *    email and password.
 * 2. Extract the issued tokens (access and refresh) from the join response.
 * 3. Call POST /auth/user/refresh with the valid refresh token obtained from step
 *    1.
 * 4. Validate that the refresh response contains a new access token and refresh
 *    token.
 * 5. Validate that tokens are strings and expiration timestamps are valid ISO
 *    date-time strings.
 */
export async function test_api_user_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword = "Password123!";
  const joinRequestBody = {
    email: userEmail,
    password: userPassword,
  } satisfies ITodoListUser.ICreate;

  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinRequestBody });
  typia.assert(joinResponse);

  // 2. Extract issued tokens
  const issuedTokens: IAuthorizationToken = joinResponse.token;
  typia.assert(issuedTokens);

  // 3. Call token refresh API with valid refresh token
  const refreshRequestBody = {
    refresh_token: issuedTokens.refresh,
  } satisfies ITodoListUser.IRefresh;

  const refreshResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshRequestBody,
    });
  typia.assert(refreshResponse);

  // 4. Validate tokens are strings
  TestValidator.predicate(
    "refresh response has valid access token",
    typeof refreshResponse.token.access === "string",
  );
  TestValidator.predicate(
    "refresh response has valid refresh token",
    typeof refreshResponse.token.refresh === "string",
  );

  // 5. Validate expiration timestamps are valid ISO date-time strings
  TestValidator.predicate(
    "refresh response expired_at format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?Z$/.test(
      refreshResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refresh response refreshable_until format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?Z$/.test(
      refreshResponse.token.refreshable_until,
    ),
  );

  // Also ensure IDs are valid UUID
  TestValidator.predicate(
    "join response user ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      joinResponse.id,
    ),
  );
  TestValidator.predicate(
    "refresh response user ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      refreshResponse.id,
    ),
  );
}
