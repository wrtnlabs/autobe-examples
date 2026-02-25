import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_data_retention_policy } from "../prepare/prepare_random_discussion_board_data_retention_policy";

export async function generate_random_discussion_board_super_admin_data_retention_policies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardDataRetentionPolicy.ICreate>;
  },
): Promise<IDiscussionBoardDataRetentionPolicy> {
  const prepared: IDiscussionBoardDataRetentionPolicy.ICreate =
    prepare_random_discussion_board_data_retention_policy(props.body);
  const result: IDiscussionBoardDataRetentionPolicy =
    await api.functional.discussionBoard.superAdmin.data_retention_policies.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
