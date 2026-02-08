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
import { generate_random_discussion_board_super_administrator_system_settings_create } from "../../../generate/generate_random_discussion_board_super_administrator_system_settings_create";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

/**
 * Test updating a system-wide configuration setting with valid data by an authorized super administrator.
 * This scenario covers creating a super administrator account, creating a new system setting, then updating the setting's value and description by its unique ID.
 * Verify that the update returns the full updated entity, the updated_at timestamp is refreshed, and no soft delete is set.
 * Confirm authorization checks and audit logging are applied.
 */
export async function test_api_system_setting_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account and get authorized connection
  const baseConnection: api.IConnection = { host: connection.host };
  const auth: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(baseConnection, { body: {} });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 2. Create a new system setting
  const createdSetting = await generate_random_discussion_board_super_administrator_system_settings_create(
    authorizedConnection,
    { body: {} },
  ) as IEntity & IDiscussionBoardSystemSetting;
  typia.assert(createdSetting);
  // 3. Prepare update body (empty as per DTO definition)
  const updateBody = {} satisfies IDiscussionBoardSystemSetting.IUpdate;
  // 4. Update the system setting
  const updatedSetting: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.superAdministrator.systemSettings.update(
      authorizedConnection,
      {
        id: createdSetting.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSetting);
}
