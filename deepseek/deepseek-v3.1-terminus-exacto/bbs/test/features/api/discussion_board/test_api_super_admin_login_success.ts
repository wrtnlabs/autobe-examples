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

export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const privilege_level = "super_admin";
  // Create a new super administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(joinConnection, {
    body: {
      email,
      password,
      privilege_level,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Create a new connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // Login with the same credentials
  const loginResult = await authorize_super_admin_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(loginResult);
  // Validate business logic - email and privilege level should match
  TestValidator.equals("email matches", loginResult.email, email);
  TestValidator.equals(
    "privilege level",
    loginResult.privilege_level,
    privilege_level,
  );
  // Verify tokens are different from join operation (session isolation)
  TestValidator.notEquals(
    "access token differs from join",
    loginResult.token.access,
    joinResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token differs from join",
    loginResult.token.refresh,
    joinResult.token.refresh,
  );
}
