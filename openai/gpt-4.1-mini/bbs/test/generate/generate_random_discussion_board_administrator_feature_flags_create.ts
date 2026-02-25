import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_feature_flag } from "../prepare/prepare_random_discussion_board_feature_flag";

/**
 * Generates a random discussion board feature flag resource by using the
 * prepare_random_discussion_board_feature_flag function and calling the
 * corresponding API operation to create it.
 *
 * @param connection The API connection interface.
 * @param props Optional input parameters containing partial creation data.
 * @returns The created IDiscussionBoardFeatureFlag resource.
 */
export async function generate_random_discussion_board_administrator_feature_flags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardFeatureFlag.ICreate>;
  },
): Promise<IDiscussionBoardFeatureFlag> {
  const prepared: IDiscussionBoardFeatureFlag.ICreate =
    prepare_random_discussion_board_feature_flag(props.body);
  const result: IDiscussionBoardFeatureFlag =
    await api.functional.discussionBoard.administrator.featureFlags.create(
      connection,
      { body: prepared },
    );
  return result;
}
