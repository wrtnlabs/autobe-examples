import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_setting_retrieve_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that unauthorized access to the system setting retrieval endpoint is rejected.
  const systemSettingId = typia.random<string & tags.Format<"uuid">>();
  // Use the base connection directly without authorization
  await TestValidator.httpError(
    "access denied when retrieving system setting without authorization",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemSettings.at(
        connection,
        {
          id: systemSettingId,
        },
      );
    },
  );
}
