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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a super administrator cannot demote a regular administrator.
 *
 * Validates the system correctly rejects demotion attempts on non-super-admin targets. Only users with super administrator privileges can be demoted; regular administrators are not valid targets for demotion.
 *
 * The test flow:
 * 1. Creates a super administrator account (actor who will attempt demotion)
 * 2. Creates a regular administrator account (target - not a super admin)
 * 3. Authenticates as the super administrator
 * 4. Attempts to demote the regular admin via the demote endpoint
 * 5. Expects HTTP 400 error with message indicating target is not a super administrator
 * 6. Verifies the regular admin account remains unchanged
 *
 * This test ensures proper authorization boundaries where super admin demotion is restricted to super admin targets only.
 */
export async function test_api_admin_demotion_invalid_target_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator who will attempt the demotion
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: `superadmin_${RandomGenerator.alphabets(8)}@test.com`,
      password: "TestPassword123!",
    },
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator account (target - not a super admin)
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphabets(8)}@test.com`,
      password: "TestPassword123!",
    },
  });
  typia.assert(regularAdmin);
  // 3. Authenticate as super administrator (already done via authorize_super_admin_join)
  // 4. Attempt to demote regular admin - should fail with 400 error
  await TestValidator.httpError(
    "cannot demote regular administrator",
    400,
    async () =>
      await api.functional.ecommerceMall.superAdmin.admin.demote(
        superAdminConnection,
        {
          userId: regularAdmin.id,
        },
      ),
  );
}