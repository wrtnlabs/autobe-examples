import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_successful_token_renewal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and join to obtain initial tokens
  const adminConnection1: api.IConnection = { host: connection.host };
  const initialAuth = await api.functional.redditClone.auth.admin.join(
    adminConnection1,
    {
      body: typia.random<
        import("@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin").IRedditCloneAdmin.IJoin
      >(),
    },
  );
  typia.assert(initialAuth);
  // 2. Extract refresh token from initial response
  const originalRefreshToken = initialAuth.token.refresh;
  const originalAccessToken = initialAuth.token.access;
  // 3. Create new admin connection for refresh operation
  const adminConnection2: api.IConnection = { host: connection.host };
  // 4. Call refresh endpoint with valid refresh token
  const refreshedAuth = await api.functional.redditClone.auth.admin.refresh(
    adminConnection2,
    {
      body: { refresh: originalRefreshToken },
    },
  );
  typia.assert(refreshedAuth);
  // 5. Verify response contains new tokens
  TestValidator.predicate(
    "has new access token",
    refreshedAuth.token.access !== "",
  );
  TestValidator.predicate(
    "has new refresh token",
    refreshedAuth.token.refresh !== "",
  );
  // 6. Verify token rotation (new tokens differ from original)
  TestValidator.notEquals(
    "access token rotated",
    originalAccessToken,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAuth.token.refresh,
  );
  // 7. Verify admin account information
  TestValidator.equals("admin id matches", initialAuth.id, refreshedAuth.id);
  TestValidator.equals(
    "admin email matches",
    initialAuth.email,
    refreshedAuth.email,
  );
  TestValidator.equals(
    "admin username matches",
    initialAuth.username,
    refreshedAuth.username,
  );
  TestValidator.equals(
    "admin display name matches",
    initialAuth.displayName,
    refreshedAuth.displayName,
  );
  TestValidator.equals("deletedAt is null", refreshedAuth.deletedAt, null);
  // 8. Validate token object structure
  TestValidator.predicate(
    "has expired_at",
    refreshedAuth.token.expired_at !== "",
  );
  TestValidator.predicate(
    "has refreshable_until",
    refreshedAuth.token.refreshable_until !== "",
  );
}
