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

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_view_not_found_admin_id(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as super admin via join
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: typia.random<IEcommerceMallSuperAdmin.IJoin>(),
    },
  );
  typia.assert(superAdmin);
  // 2. Generate a valid UUID that doesn't correspond to any existing admin
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent admin and verify 404 response
  await TestValidator.httpError(
    "should return 404 for non-existent admin id",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.admins.at(
        superAdminConnection,
        {
          adminId: nonExistentAdminId,
        },
      );
    },
  );
}
