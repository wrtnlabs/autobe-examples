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
 * Test that a regular administrator cannot perform demotion operations.
 *
 * This test validates the authorization requirement that only super administrators
 * can demote other administrators. A newly created admin has 'regular' grade by
 * default and should receive a 403 Forbidden error when attempting to demote.
 */
export async function test_api_admin_demote_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular admin account (default grade is 'regular')
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {});
  typia.assert(regularAdmin);
  // Verify the admin has 'regular' grade
  TestValidator.equals("regular admin grade", regularAdmin.grade, "regular");
  // 2. Regular admin attempts to demote another admin
  // Using a random UUID as target - authorization check happens before target validation
  const targetAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Expect 403 Forbidden error due to insufficient grade level
  await TestValidator.httpError(
    "regular admin cannot demote",
    403,
    async () => {
      await api.functional.shoppingMall.admin.admins.demote(
        regularAdminConnection,
        {
          adminId: targetAdminId,
        },
      );
    },
  );
}
