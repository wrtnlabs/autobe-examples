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

export async function test_api_super_admin_at_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using utility function
  await authorize_super_admin_join(superAdminConnection, {});
  // Test 404 error when attempting to retrieve non-existent super admin
  await TestValidator.httpError(
    "returns 404 when super admin not found",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.super_admins.at(
        superAdminConnection,
        {
          superAdminId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );
}
