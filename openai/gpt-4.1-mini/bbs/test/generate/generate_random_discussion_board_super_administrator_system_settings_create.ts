import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_system_setting } from "../prepare/prepare_random_discussion_board_system_setting";

export async function generate_random_discussion_board_super_administrator_system_settings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSystemSetting.ICreate> | undefined;
  },
): Promise<IDiscussionBoardSystemSetting> {
  const prepared: IDiscussionBoardSystemSetting.ICreate =
    prepare_random_discussion_board_system_setting(props.body);
  const result: IDiscussionBoardSystemSetting =
    await api.functional.discussionBoard.superAdministrator.systemSettings.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
