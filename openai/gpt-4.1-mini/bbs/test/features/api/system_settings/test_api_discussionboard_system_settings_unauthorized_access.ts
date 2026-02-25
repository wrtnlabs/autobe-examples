import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_system_settings_create_system_settings } from "../../../generate/generate_random_discussion_board_administrator_system_settings_create_system_settings";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

export async function test_api_discussionboard_system_settings_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to create or update a system setting without any authentication
  const body = {
    key: typia.random<string>(),
    value: typia.random<string>(),
    description: typia.random<string>(),
  } satisfies IDiscussionBoardSystemSetting.ICreate;
  // Direct call with base connection (no admin authentication)
  await TestValidator.httpError(
    "should reject system setting creation without administrator authentication",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.systemSettings.createSystemSettings(
        connection,
        {
          body,
        },
      );
    },
  );
}
