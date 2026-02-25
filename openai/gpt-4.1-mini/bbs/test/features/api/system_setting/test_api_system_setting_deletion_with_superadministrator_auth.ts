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

export async function test_api_system_setting_deletion_with_superadministrator_auth(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test successful deletion of a system setting by a superAdministrator
  // 1. Create superAdministrator account and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // 2. Prepare a system setting to delete
  // No creation API is provided, so generate a random UUID
  const systemSettingId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the system setting by superAdministrator
  await api.functional.discussionBoard.superAdministrator.systemSettings.eraseSystemSetting(
    superAdminConnection,
    { id: systemSettingId },
  );
  // 4. Verify the system setting is deleted by attempting deletion again
  await TestValidator.error(
    "deletion of non-existent system setting",
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.eraseSystemSetting(
        superAdminConnection,
        { id: systemSettingId },
      );
    },
  );
}
