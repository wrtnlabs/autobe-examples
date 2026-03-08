import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account and get initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(initialAuth);
  const initialRefreshToken = initialAuth.token.refresh;
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // 2. Test: Call refresh with valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(refreshConnection, {
    body: { refreshToken: initialRefreshToken },
  });
  typia.assert(refreshedAuth);
  // 3. Validate token rotation (new tokens should be different)
  TestValidator.notEquals(
    "refresh token rotated",
    initialRefreshToken,
    refreshedAuth.token.refresh,
  );
  TestValidator.notEquals(
    "access token rotated",
    initialAccessToken,
    refreshedAuth.token.access,
  );
  // 4. Validate admin profile consistency
  TestValidator.equals("admin id matches", initialAuth.id, refreshedAuth.id);
  TestValidator.equals(
    "admin email matches",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals("grade is regular", refreshedAuth.grade, "regular");
  TestValidator.equals("not banned", refreshedAuth.bannedAt, null);
  TestValidator.equals("not deleted", refreshedAuth.deletedAt, null);
  // 5. Validate token expiration is in future
  const now = new Date();
  const expiredAt = new Date(refreshedAuth.token.expired_at);
  const refreshableUntil = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refreshable until is in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // 6. Validate session expiration is maintained or extended
  const initialRefreshableDate = new Date(initialRefreshableUntil);
  TestValidator.predicate(
    "session expiration maintained or extended",
    refreshableUntil >= initialRefreshableDate,
  );
}
