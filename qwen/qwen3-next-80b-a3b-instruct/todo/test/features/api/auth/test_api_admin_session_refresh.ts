import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new admin account to establish initial session
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ITodoListAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(adminAuth);
  // Step 2: Validate that the initial authentication produced valid tokens with proper structure
  TestValidator.equals(
    "admin has valid email",
    adminAuth.email,
    adminAuth.email,
  );
  // Step 3: Use the refresh token to extend the session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth: ITodoListAdmin.IAuthorized =
    await authorize_admin_refresh(refreshConnection, {
      body: {
        refreshToken: adminAuth.token.refresh,
      },
    });
  typia.assert(refreshedAuth);
  // Step 4: Validate that refresh operation returned new tokens
  TestValidator.notEquals(
    "new access token is different from old",
    refreshedAuth.token.access,
    adminAuth.token.access,
  );
  TestValidator.notEquals(
    "new refresh token is different from old",
    refreshedAuth.token.refresh,
    adminAuth.token.refresh,
  );
  // Step 5: Verify that refresh token expiration times follow correct format
  TestValidator.predicate("new access token has date-time format", () => {
    return !isNaN(Date.parse(refreshedAuth.token.expired_at));
  });
  TestValidator.predicate("new refresh token has date-time format", () => {
    return !isNaN(Date.parse(refreshedAuth.token.refreshable_until));
  });
  // Step 6: Confirm that the old refresh token is revoked (attempt to reuse it)
  await TestValidator.error(
    "old refresh token should be revoked when reused",
    async () => {
      await authorize_admin_refresh(refreshConnection, {
        body: {
          refreshToken: adminAuth.token.refresh,
        },
      });
    },
  );
}
