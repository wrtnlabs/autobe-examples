import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test scenario for successful deletion of an administrator promotion or demotion record.
 * Steps:
 * 1. Authenticate as superAdministrator (join new super admin user).
 * 2. Create an administrator promotion record (via assumed API or mocked).
 *    Since no API exists in the provided info, simulate creation by random UUID generation.
 * 3. Delete the promotion record by valid promotionId.
 * 4. Verify HTTP 204 No Content response.
 * 5. Confirm record is removed from the database (via GET or database check).
 *    Since no GET is provided, only check for no errors on deletion.
 * This tests role-based authorization, existence check, and cascading deletion behavior.
 */
export async function test_api_super_administrator_promotion_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_super_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(adminUser);
  const authedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminUser.token.access },
  };
  // 2. Create an administrator promotion record (simulate UUID)
  const promotionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the promotion record
  await api.functional.discussionBoard.superAdministrator.administrator.promotions.erase(
    authedConnection,
    { promotionId },
  );
  // 4. No Content response expected, no output to validate
  // 5. Confirm deletion by attempting to delete again and expecting error
  await TestValidator.error(
    "deleting non-existing promotion should fail",
    async () => {
      await api.functional.discussionBoard.superAdministrator.administrator.promotions.erase(
        authedConnection,
        { promotionId },
      );
    },
  );
}
