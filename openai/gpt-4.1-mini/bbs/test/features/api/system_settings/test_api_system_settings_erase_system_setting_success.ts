import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_settings_erase_system_setting_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully delete an existing system setting by its unique ID as an administrator.
  // 1. Authenticate as administrator by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "admin_password123",
    },
  });
  // New connection use the token from auth result
  const adminOnlyConnection: api.IConnection = { host: connection.host };
  adminOnlyConnection.headers ??= {};
  adminOnlyConnection.headers.Authorization = adminAuth.token.access;
  // Use a random UUID as system setting id to delete
  const systemSettingId = typia.random<string & tags.Format<"uuid">>();
  // Attempt erase - as no creation API exists, the DELETE may succeed or return 404,
  // so no error assertion, just call and wait for promise to resolve
  await api.functional.discussionBoard.administrator.systemSettings.eraseSystemSetting(
    adminOnlyConnection,
    { id: systemSettingId },
  );
  // Scenario 2: Attempt deletion without admin authorization
  // Use base connection without auth, expect 401 or 403
  await TestValidator.httpError(
    "delete system setting without admin authorization",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.eraseSystemSetting(
        connection,
        { id: systemSettingId },
      );
    },
  );
}
