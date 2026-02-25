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

export async function test_api_system_settings_erase_system_setting_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to delete a system setting without administrator authorization.
  // We do NOT authorize as administrator (no auth token)
  // We call eraseSystemSetting API directly with random UUID
  const randomId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should reject deletion without authorization",
    401,
    async () => {
      // Use base connection WITHOUT admin authorization header
      await api.functional.discussionBoard.administrator.systemSettings.eraseSystemSetting(
        connection,
        {
          id: randomId,
        },
      );
    },
  );
}
