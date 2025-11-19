import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate renewal of JWT tokens for a user session with the refresh token.
 *
 * - Registers (joins) a new user for the discussion board.
 * - Obtains the initial JWT token and refresh token from registration response.
 * - Submits the refresh token to /auth/user/refresh to obtain a new set of JWT
 *   tokens.
 * - Validates that the refresh token is accepted, the response schema matches
 *   IDiscussionBoardUser.IAuthorized, and the newly issued access/refresh
 *   tokens are not equal to the previous ones (if rotation applies).
 * - Ensures session continuation is possible and all schema fields are present
 *   and correctly typed.
 */
export async function test_api_user_refresh_token_for_jwt_renewal(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
  } satisfies IDiscussionBoardUser.ICreate;
  const joined: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: userCreate });
  typia.assert(joined);
  TestValidator.equals(
    "joined email equals input email",
    joined.email,
    userCreate.email,
  );
  TestValidator.predicate(
    "token should have access and refresh",
    joined.token.access.length > 0 && joined.token.refresh.length > 0,
  );

  // 2. Use the refresh token to get new JWT tokens
  const refreshInput = {
    token: joined.token.refresh,
  } satisfies IDiscussionBoardUser.IRefresh;
  const refreshed: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, { body: refreshInput });
  typia.assert(refreshed);

  // 3. Validate returned identity and tokens
  TestValidator.equals(
    "user id remains stable after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "user email remains stable after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.notEquals(
    "new token.access after refresh",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "new refresh token after rotation",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  TestValidator.predicate(
    "refreshed token fields (access, refresh, expiration) are non-empty",
    refreshed.token.access.length > 0 &&
      refreshed.token.refresh.length > 0 &&
      typeof refreshed.token.expired_at === "string" &&
      typeof refreshed.token.refreshable_until === "string",
  );
}
