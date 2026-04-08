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

/**
 * Test that a super administrator cannot demote their own account.
 *
 * Validates the critical business rule that prevents self-demotion. This ensures
 * at least one super administrator always retains full platform authority. The test
 * creates a super admin account, authenticates, then attempts to demote the own
 * account which should be rejected with HTTP 400 error.
 *
 * 1. Create and authenticate a super administrator account.
 * 2. Attempt to demote own account using the demote endpoint.
 * 3. Verify HTTP 400 error response indicating self-demotion prevention.
 */
export async function test_api_admin_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Attempt to demote own account - should fail with HTTP 400
  await TestValidator.httpError(
    "self demotion should be rejected",
    400,
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin.demote(
        superAdminConnection,
        {
          userId: superAdmin.id,
        },
      ),
  );
}
