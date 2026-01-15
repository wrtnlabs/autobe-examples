import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import { prepare_random_discussion_board_configuration } from "../prepare/prepare_random_discussion_board_configuration";
export async function generate_random_discussion_board_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardConfiguration.ICreate>;
  },
): Promise<IDiscussionBoardConfiguration> {
  const prepared: IDiscussionBoardConfiguration.ICreate =
    prepare_random_discussion_board_configuration(props.body);
  const result: IDiscussionBoardConfiguration =
    await api.functional.discussionBoard.configurations.create(connection, {
      body: prepared,
    });
  return result;
}
