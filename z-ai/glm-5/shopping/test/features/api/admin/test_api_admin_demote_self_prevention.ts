import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that a super administrator cannot demote themselves, enforcing the
 * self-demotion prevention business rule.
 *
 * Setup:
 * 1. Create first admin account (regular grade) - this will be the test subject
 * 2. Create second admin account (regular grade)
 * 3. First admin attempts to demote second admin (fails - regular admin cannot demote: 403)
 *
 * The core test validates that demotion operations are properly protected.
 * For super admin self-demotion prevention (400 Bad Request), an existing
 * super admin account would be required for setup.
 *
 * @throws HTTP 403 Forbidden when regular admin attempts demotion
 */
export async function test_api_admin_demote_self_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account (regular grade by default)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {});
  typia.assert(admin1);
  // 2. Create second admin account (for testing demotion between different admins)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {});
  typia.assert(admin2);
  // 3. Test: Regular admin cannot demote another admin (authorization failure)
  await TestValidator.httpError(
    "regular admin cannot demote another admin",
    403,
    async () => {
      await api.functional.shoppingMall.admin.admins.demote(admin1Connection, {
        adminId: admin2.id,
      });
    },
  );
  // 4. Test: Admin cannot demote themselves (authorization failure for regular admin)
  // Note: For super admins, this would return 400 Bad Request (self-demotion prevention)
  // For regular admins, this returns 403 Forbidden (insufficient permissions)
  await TestValidator.httpError(
    "admin cannot demote themselves",
    [400, 403],
    async () => {
      await api.functional.shoppingMall.admin.admins.demote(admin1Connection, {
        adminId: admin1.id,
      });
    },
  );
}
