import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(registered);
  // 2. Create new connection with token from registration
  const refreshedConnection: api.IConnection = {
    host: connection.host,
  };
  refreshedConnection.headers = {
    Authorization: registered.token.access,
  };
  // 3. Refresh the token with valid refresh token
  const refreshed = await api.functional.redditClone.auth.member.refresh(
    refreshedConnection,
    {
      body: {
        refresh_token: registered.token.refresh,
      } satisfies IRedditCloneMember.IRefresh,
    },
  );
  typia.assert(refreshed);
  // 4. Validate refreshed token structure
  TestValidator.equals(
    "response has valid token structure",
    typeof refreshed.token,
    "object",
  );
  TestValidator.equals(
    "access token is string",
    typeof refreshed.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token is string",
    typeof refreshed.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token is not empty",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.equals(
    "token has expired_at field",
    typeof refreshed.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token has refreshable_until field",
    typeof refreshed.token.refreshable_until,
    "string",
  );
  // 5. Verify token refresh created a new session (different tokens)
  TestValidator.notEquals(
    "new access token differs from old",
    refreshed.token.access,
    registered.token.access,
  );
  TestValidator.notEquals(
    "new refresh token differs from old",
    refreshed.token.refresh,
    registered.token.refresh,
  );
  // 6. Verify the old access token is no longer valid
  const oldConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: registered.token.access,
    },
  };
  await TestValidator.error("old access token is invalidated", async () => {
    // Try to use old access token - should fail
    await api.functional.redditClone.auth.member.refresh(oldConnection, {
      body: {
        refresh_token: registered.token.refresh,
      } satisfies IRedditCloneMember.IRefresh,
    });
  });
}
