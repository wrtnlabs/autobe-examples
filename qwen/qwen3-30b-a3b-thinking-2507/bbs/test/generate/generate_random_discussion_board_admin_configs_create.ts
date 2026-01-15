import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfig";
import { prepare_random_discussion_board_config } from "../prepare/prepare_random_discussion_board_config";
export async function generate_random_discussion_board_admin_configs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardConfig.ICreate>;
  },
): Promise<IDiscussionBoardConfig> {
  const prepared: IDiscussionBoardConfig.ICreate =
    prepare_random_discussion_board_config(props.body);
  const result: IDiscussionBoardConfig =
    await api.functional.discussionBoard.admin.configs.create(connection, {
      body: prepared,
    });
  return result;
}
