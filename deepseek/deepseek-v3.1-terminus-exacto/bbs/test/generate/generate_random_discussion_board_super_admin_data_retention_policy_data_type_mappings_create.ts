import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import type { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_data_retention_policy_data_type } from "../prepare/prepare_random_discussion_board_data_retention_policy_data_type";

export async function generate_random_discussion_board_super_admin_data_retention_policy_data_type_mappings_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IDiscussionBoardDataRetentionPolicyDataType.ICreate>
      | undefined;
  },
): Promise<IDiscussionBoardDataRetentionPolicyDataType> {
  const prepared: IDiscussionBoardDataRetentionPolicyDataType.ICreate =
    prepare_random_discussion_board_data_retention_policy_data_type(props.body);
  return await api.functional.discussionBoard.superAdmin.data_retention_policy_data_type_mappings.create(
    connection,
    {
      body: prepared,
    },
  );
}
