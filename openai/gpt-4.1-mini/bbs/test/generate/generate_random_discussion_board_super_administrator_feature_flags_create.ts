import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_feature_flag } from "../prepare/prepare_random_discussion_board_feature_flag";

export async function generate_random_discussion_board_super_administrator_feature_flags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardFeatureFlag.ICreate> | undefined;
  },
): Promise<IDiscussionBoardFeatureFlag> {
  const prepared: IDiscussionBoardFeatureFlag.ICreate =
    prepare_random_discussion_board_feature_flag(props.body);
  const result: IDiscussionBoardFeatureFlag =
    await api.functional.discussionBoard.superAdministrator.featureFlags.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
