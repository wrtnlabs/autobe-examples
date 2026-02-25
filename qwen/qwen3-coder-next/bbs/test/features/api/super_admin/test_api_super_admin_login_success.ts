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
  // Step 1: Create super admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123!",
    name: RandomGenerator.name(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const joinedAdmin = await authorize_super_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(joinedAdmin);
  // Step 2: Test successful login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_super_admin_login(loginConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Validate super admin login response
  TestValidator.equals(
    "isSuperAdmin is true",
    loginResponse.isSuperAdmin,
    true,
  );
  TestValidator.equals(
    "canPromoteSuperAdmins is true",
    loginResponse.canPromoteSuperAdmins,
    true,
  );
  TestValidator.equals(
    "email matches",
    loginResponse.email,
    adminCredentials.email,
  );
}
