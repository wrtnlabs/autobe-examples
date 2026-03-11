import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_system_configuration } from "../prepare/prepare_random_discussion_board_system_configuration";

export async function generate_random_discussion_board_admin_system_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSystemConfiguration.ICreate> | undefined;
  },
): Promise<IDiscussionBoardSystemConfiguration> {
  const prepared: IDiscussionBoardSystemConfiguration.ICreate =
    prepare_random_discussion_board_system_configuration(props.body);
  const result: IDiscussionBoardSystemConfiguration =
    await api.functional.discussionBoard.admin.system_configurations.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
