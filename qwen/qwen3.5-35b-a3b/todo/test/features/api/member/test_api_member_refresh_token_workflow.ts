import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Extract original tokens
  const originalAccessToken = joinResult.token.access;
  const originalRefreshToken = joinResult.token.refresh;
  const originalExpiredAt = joinResult.token.expired_at;
  const originalRefreshableUntil = joinResult.token.refreshable_until;
  // 3. Prepare refresh request with original refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await authorize_member_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefreshToken,
    },
  });
  typia.assert(refreshResult);
  // 4. Validate member identity remains consistent
  TestValidator.equals("member id", refreshResult.id, joinResult.id);
  TestValidator.equals("member email", refreshResult.email, joinResult.email);
  TestValidator.equals(
    "created_at",
    refreshResult.created_at,
    joinResult.created_at,
  );
  TestValidator.equals(
    "deleted_at",
    refreshResult.deleted_at,
    joinResult.deleted_at,
  );
  // 5. Validate new tokens are different from original tokens
  TestValidator.notEquals(
    "new access token",
    refreshResult.token.access,
    originalAccessToken,
  );
  TestValidator.notEquals(
    "new refresh token",
    refreshResult.token.refresh,
    originalRefreshToken,
  );
  // 6. Validate new expiration times are different
  TestValidator.notEquals(
    "new expired_at",
    refreshResult.token.expired_at,
    originalExpiredAt,
  );
  TestValidator.notEquals(
    "new refreshable_until",
    refreshResult.token.refreshable_until,
    originalRefreshableUntil,
  );
  // 7. Validate token structure has all required fields
  typia.assert(refreshResult.token);
  const token: IAuthorizationToken = refreshResult.token;
  TestValidator.predicate("access token exists", token.access.length > 0);
  TestValidator.predicate("refresh token exists", token.refresh.length > 0);
  TestValidator.predicate("expired_at exists", token.expired_at.length > 0);
  TestValidator.predicate(
    "refreshable_until exists",
    token.refreshable_until.length > 0,
  );
  // 8. Validate timestamps are in the future
  const now = new Date();
  const expiredAtDate = new Date(token.expired_at);
  const refreshableUntilDate = new Date(token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAtDate > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntilDate > now,
  );
  // 9. Validate refreshable_until extends beyond expired_at
  TestValidator.predicate(
    "refreshable_until extends beyond expired_at",
    refreshableUntilDate > expiredAtDate,
  );
  // 10. Validate updated_at reflects the refresh time (should be different from created_at)
  const updatedAtDate = new Date(refreshResult.updated_at);
  const createdAtDate = new Date(refreshResult.created_at);
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAtDate > createdAtDate,
  );
}