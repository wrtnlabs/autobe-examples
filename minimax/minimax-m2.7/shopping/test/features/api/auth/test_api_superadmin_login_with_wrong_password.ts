import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_login_with_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super admin account using join utility
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(joinedSuperAdmin);
  // 2. Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  const wrongPassword = (RandomGenerator.alphaNumeric(16) +
    "Wrong!") as string & tags.Format<"password">;
  // 3. Validate login fails with 401 Unauthorized
  await TestValidator.httpError("wrong password returns 401", 401, async () => {
    await api.functional.ecommerceMall.auth.superAdmin.login(loginConnection, {
      body: {
        email: joinedSuperAdmin.email,
        password: wrongPassword,
      } satisfies IEcommerceMallSuperAdmin.ILogin,
    });
  });
}
