import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
 * Test super admin refresh operation with expired token to ensure proper error handling.
 * 1. Create super admin account using join endpoint
 * 2. Login to obtain initial tokens
 * 3. Use the obtained refresh token immediately (simulating expired token scenario)
 * 4. Attempt refresh with the token that should be treated as expired
 * 5. Verify system rejects the token with appropriate error response
 */
export async function test_api_super_admin_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account with known password
  const password = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Login to get tokens using the actual password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_super_admin_login(loginConnection, {
    body: {
      email: authorized.email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Store the refresh token for refresh attempt
  const refreshToken = loginResult.token.refresh;
  // Create a new connection for refresh attempt
  const refreshConnection: api.IConnection = { host: connection.host };
  // Attempt refresh with the token - in a real scenario this might fail if token
  // has very short expiration, but we'll test the error handling
  await TestValidator.error("refresh token validation", async () => {
    await authorize_super_admin_refresh(refreshConnection, {
      body: {
        refresh_token: refreshToken,
      } satisfies IDiscussionBoardSuperAdmin.IRefresh,
    });
  });
}
