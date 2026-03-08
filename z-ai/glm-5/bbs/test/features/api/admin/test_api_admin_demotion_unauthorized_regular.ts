import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that a regular administrator (non-super) cannot perform demotion operations.
 * This enforces the authorization boundary where only super administrators
 * have the privilege to demote other administrators.
 */
export async function test_api_admin_demotion_unauthorized_regular(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a regular administrator (default grade='regular')
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {});
  typia.assert(regularAdmin);
  // Verify this admin has regular grade (not super)
  TestValidator.equals("admin is regular grade", regularAdmin.grade, "regular");
  // Step 2: Create a target administrator for the demotion attempt
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(targetAdminConnection, {});
  typia.assert(targetAdmin);
  // Step 3: Regular admin attempts to demote target - should receive 403 Forbidden
  await TestValidator.httpError(
    "regular admin cannot demote another admin",
    403,
    async () => {
      await api.functional.discussionBoard.admin.admins.demote(
        regularAdminConnection,
        { adminId: targetAdmin.id },
      );
    },
  );
}
