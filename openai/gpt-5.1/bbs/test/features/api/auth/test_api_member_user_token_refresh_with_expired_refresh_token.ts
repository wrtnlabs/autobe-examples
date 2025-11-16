import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserRefresh";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

export async function test_api_member_user_token_refresh_with_expired_refresh_token(
  connection: api.IConnection,
) {
  // 1. Register a new member user and obtain initial tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://discussion-board.example.com/signup",
    referrer: "https://discussion-board.example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const authorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const originalToken: IAuthorizationToken = authorized.token;
  typia.assert(originalToken);

  // 2. Build an invalid/"expired" refresh token from the valid one
  const originalRefresh: string = originalToken.refresh;
  const invalidRefresh: string =
    originalRefresh.length > 5
      ? `${originalRefresh.substring(0, originalRefresh.length - 5)}xxxxx`
      : `${originalRefresh}xxxxx`;

  // 3. Try to refresh with the invalid token and expect failure
  const invalidRefreshBody = {
    refresh_token: invalidRefresh,
  } satisfies IDiscussionBoardMemberUserRefresh.IRequest;

  await TestValidator.error(
    "refresh with invalid token should fail",
    async () => {
      await api.functional.auth.memberUser.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );

  // 4. Retry with the same invalid token to confirm consistent behavior
  await TestValidator.error(
    "refresh with same invalid token should consistently fail",
    async () => {
      await api.functional.auth.memberUser.refresh(connection, {
        body: invalidRefreshBody,
      });
    },
  );

  // 5. Use the original valid refresh token to confirm success path still works
  const validRefreshBody = {
    refresh_token: originalRefresh,
  } satisfies IDiscussionBoardMemberUserRefresh.IRequest;

  const refreshed: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.refresh(connection, {
      body: validRefreshBody,
    });
  typia.assert(refreshed);

  // Basic business assertions: same member id and email, new access token
  TestValidator.equals(
    "refreshed member id should match original",
    refreshed.id,
    authorized.id,
  );
  TestValidator.equals(
    "refreshed member email should match original",
    refreshed.email,
    authorized.email,
  );
  TestValidator.notEquals(
    "access token should rotate on refresh",
    refreshed.token.access,
    originalToken.access,
  );
}
