import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserRefresh";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

export async function test_api_admin_user_token_refresh_with_invalid_refresh_token(
  connection: api.IConnection,
) {
  // 1. Join a new admin user to obtain a valid token set
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const joined: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  const validRefreshToken: string = joined.token.refresh;

  // 2. Call refresh with an obviously invalid refresh token and ensure it fails
  const invalidRefreshBody = {
    refreshToken: "this-is-not-a-valid-refresh-token",
  } satisfies IDiscussionBoardAdminUserRefresh.IRequest;

  await TestValidator.error(
    "refresh with invalid token must fail",
    async () => {
      await api.functional.auth.adminUser.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );

  // 3. Call refresh again with the original valid refresh token and ensure it succeeds
  const validRefreshBody = {
    refreshToken: validRefreshToken,
  } satisfies IDiscussionBoardAdminUserRefresh.IRequest;

  const refreshed: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.refresh(connection, {
      body: validRefreshBody,
    });
  typia.assert(refreshed);

  // 4. Basic business validations: same admin id and email should be preserved
  TestValidator.equals(
    "admin id must be preserved after refresh",
    refreshed.id,
    joined.id,
  );

  TestValidator.equals(
    "admin email must be preserved after refresh",
    refreshed.email,
    joined.email,
  );

  // 5. New access token should differ from the previous one in most realistic scenarios.
  //    However, since implementation details may vary, we only assert that a
  //    non-empty access token exists.
  TestValidator.predicate(
    "refreshed access token must be non-empty",
    refreshed.token.access.length > 0,
  );

  TestValidator.predicate(
    "refreshed refresh token must be non-empty",
    refreshed.token.refresh.length > 0,
  );
}
