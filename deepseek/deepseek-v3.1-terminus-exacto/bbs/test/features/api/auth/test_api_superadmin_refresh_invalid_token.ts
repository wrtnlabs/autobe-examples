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
 * Test token refresh with an invalid refresh token.
 * Create a superAdmin account via join operation to obtain valid tokens.
 * Then attempt to refresh using a malformed or tampered refresh token.
 * Validate that the operation properly rejects invalid tokens with appropriate
 * error response, ensuring security against token manipulation attacks.
 */
export async function test_api_superadmin_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superAdmin account and obtain valid tokens
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Extract valid refresh token
  const validRefreshToken = authorized.token.refresh;
  // 3. Create invalid refresh token by tampering with the valid one
  const invalidRefreshToken = validRefreshToken + "_tampered";
  // 4. Attempt to refresh using invalid token
  await TestValidator.error("refresh should reject invalid token", async () => {
    await api.functional.discussionBoard.auth.superAdmin.refresh(
      superAdminConnection,
      {
        body: {
          refresh_token: invalidRefreshToken,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      },
    );
  });
}
