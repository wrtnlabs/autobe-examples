import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
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

export async function test_api_admin_retrieval_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super admin account for testing
  const superAdminAuth = await authorize_super_admin_join(connection, {});
  // 2. Test unauthenticated request - should return HTTP 401
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated request returns 401",
    401,
    async () => {
      await api.functional.ecommerceMall.superAdmin.superAdmin.admins.at(
        unauthenticatedConnection,
        {
          adminId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 3. Test authenticated super admin access - should succeed
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${superAdminAuth.token.access}`,
    },
  };
  const adminId = typia.random<string & tags.Format<"uuid">>();
  const admin =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.at(
      superAdminConnection,
      {
        adminId: adminId,
      },
    );
  typia.assert(admin);
}
