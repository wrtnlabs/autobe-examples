import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_health_check } from "../prepare/prepare_random_discussion_board_health_check";

export async function generate_random_discussion_board_super_administrator_health_checks_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardHealthCheck.ICreate> | undefined;
  },
): Promise<IDiscussionBoardHealthCheck> {
  const prepared: IDiscussionBoardHealthCheck.ICreate =
    prepare_random_discussion_board_health_check(props.body);
  const result: IDiscussionBoardHealthCheck =
    await api.functional.discussionBoard.superAdministrator.healthChecks.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
