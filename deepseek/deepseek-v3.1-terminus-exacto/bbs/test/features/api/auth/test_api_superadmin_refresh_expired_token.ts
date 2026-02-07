import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test token refresh with an expired refresh token.
 * 1. Create superAdmin account via join operation to obtain initial tokens
 * 2. Simulate token expiration by using an invalid refresh token
 * 3. Attempt to refresh using the expired/invalid token
 * 4. Validate that the operation properly rejects the request with error
 */
export async function test_api_superadmin_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin account and obtain initial tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Simulate token expiration by using an invalid refresh token
  const invalidRefreshToken = "expired_or_invalid_refresh_token_12345";
  // 3. Attempt to refresh using the expired/invalid token
  await TestValidator.error(
    "refresh with expired token should fail",
    async () => {
      await authorize_super_admin_refresh(superAdminConnection, {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      });
    },
  );
}
