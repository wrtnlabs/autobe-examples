import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_session_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to obtain initial access and refresh tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(joinResult);
  // Extract the refresh token from registration response
  const refreshToken: string = joinResult.token.refresh;
  // 2. Call refresh endpoint with the valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken,
    } satisfies IRedditCommunityMember.IRefresh,
  });
  typia.assert(refreshResult);
  // 3. Validate token rotation - new tokens should be different from old
  TestValidator.notEquals(
    "access token renewed",
    joinResult.token.access,
    refreshResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    refreshToken,
    refreshResult.token.refresh,
  );
  // 4. Validate token structure properties exist and have valid formats
  TestValidator.equals(
    "access token present",
    refreshResult.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token present",
    refreshResult.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "access expired_at present",
    refreshResult.token.expired_at !== undefined,
    true,
  );
  TestValidator.equals(
    "refreshable_until present",
    refreshResult.token.refreshable_until !== undefined,
    true,
  );
  // 5. Validate token expiration timestamps are in valid ISO 8601 format
  TestValidator.predicate(
    "expired_at is valid ISO date-time",
    () => !isNaN(Date.parse(refreshResult.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date-time",
    () => !isNaN(Date.parse(refreshResult.token.refreshable_until)),
  );
}
