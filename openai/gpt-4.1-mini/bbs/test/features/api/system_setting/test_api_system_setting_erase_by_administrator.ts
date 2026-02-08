import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_setting_erase_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful deletion by administrator.
  // Scenario 2: Attempt to delete a non-existent system setting.
  // Scenario 3: Unauthorized deletion attempt.
  // Create admin connection and authorize administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Since create API for system setting is not given, we generate a UUID for deletion test
  const existingSettingId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: administrator deletes existing system setting
  await api.functional.discussionBoard.administrator.systemSettings.erase(
    adminConnection,
    {
      id: existingSettingId,
    },
  ); // expect void return, no content
  // Scenario 2: administrator tries deleting non-existent system setting
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent system setting",
    [404],
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.erase(
        adminConnection,
        { id: nonExistentId },
      );
    },
  );
  // Scenario 3: unauthorized deletion attempt by guest
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized delete by guest",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.erase(
        guestConnection,
        { id: existingSettingId },
      );
    },
  );
}
