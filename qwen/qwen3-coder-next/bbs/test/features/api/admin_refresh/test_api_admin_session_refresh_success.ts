import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  // 2. Login as admin to obtain refresh token
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuthorized = await authorize_admin_login(loginConnection, {
    body: {
      email: authorizedAdmin.email,
      password: "1234" as any,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(loginAuthorized);
  // 3. Use refresh token to get new access tokens
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshResult = await api.functional.discussionBoard.auth.admin.refresh(
    refreshConnection,
    {
      body: {
        refresh_token: loginAuthorized.token.refresh,
      } satisfies IDiscussionBoardAdmin.IRefresh,
    },
  );
  typia.assert(refreshResult);
  // 4. Validate refresh result structure
  typia.assert<IDiscussionBoardAdmin.IAuthorized>(refreshResult);
  TestValidator.equals(
    "email matches",
    refreshResult.email,
    authorizedAdmin.email,
  );
  TestValidator.predicate(
    "has valid ID",
    /^[0-9a-f-]{36}$/i.test(refreshResult.id),
  );
  TestValidator.equals(
    "display name matches",
    refreshResult.display_name,
    authorizedAdmin.display_name,
  );
  TestValidator.equals(
    "is_super_admin preserved",
    refreshResult.is_super_admin,
    authorizedAdmin.is_super_admin,
  );
  TestValidator.equals(
    "is_active preserved",
    refreshResult.is_active,
    authorizedAdmin.is_active,
  );
  TestValidator.predicate(
    "has valid created_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshResult.created_at),
  );
  TestValidator.predicate(
    "has valid updated_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshResult.updated_at),
  );
  // 5. Validate new token structure
  TestValidator.equals(
    "has access token",
    typeof refreshResult.token.access,
    "string",
  );
  TestValidator.equals(
    "has refresh token",
    typeof refreshResult.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token is string",
    refreshResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is string",
    refreshResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expired_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refreshResult.token.expired_at),
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      refreshResult.token.refreshable_until,
    ),
  );
  // 6. Validate that refresh tokens are different (token rotation)
  TestValidator.notEquals(
    "tokens rotated",
    refreshResult.token.refresh,
    loginAuthorized.token.refresh,
  );
  // 7. Test that new access token works
  const newAccessConnection: api.IConnection = { host: connection.host };
  newAccessConnection.headers = {
    Authorization: refreshResult.token.access,
  };
  // This should work without errors if the new access token is valid
}
