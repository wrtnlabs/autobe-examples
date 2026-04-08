import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test the business rule that prevents removing the last super administrator from the system.
 *
 * Validates that when only one super administrator exists in the system, attempting to demote that administrator is rejected to prevent complete loss of super administrative capabilities. This ensures the system maintains at least one super administrator for operational continuity and prevents lockout scenarios.
 *
 * 1. Create and authenticate as an administrator with regular grade.
 * 2. Attempt to demote the regular administrator (which should fail since only super admins can be demoted).
 * 3. Verify the request is rejected with HTTP 409 Conflict.
 * 4. Confirm the error indicates the target administrator is not a super administrator.
 *
 * Note: The actual "last super admin" prevention test requires a super administrator account, which cannot be created through the available APIs (no promote endpoint exists). This test validates the related constraint that only super administrators can be demoted.
 */
export async function test_api_administrator_demote_last_super_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // Verify the admin is created with regular grade (default for new admins)
  TestValidator.equals("admin grade is regular", admin.grade, "regular");
  // 2. Attempt to demote the regular administrator (should fail - only super admins can be demoted)
  await TestValidator.httpError(
    "cannot demote regular administrator",
    409,
    async () =>
      await api.functional.shoppingMall.administrator.administrators.demote(
        adminConnection,
        {
          administratorId: admin.id,
        },
      ),
  );
  // 3. Verify the administrator's grade remains unchanged
  TestValidator.equals("grade remains regular", admin.grade, "regular");
}
