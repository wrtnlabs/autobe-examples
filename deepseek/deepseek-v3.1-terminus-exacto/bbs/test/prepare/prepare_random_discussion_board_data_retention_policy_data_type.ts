import { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_data_retention_policy_data_type(
  input?: DeepPartial<IDiscussionBoardDataRetentionPolicyDataType.ICreate>,
): IDiscussionBoardDataRetentionPolicyDataType.ICreate {
  return {
    discussion_board_data_retention_policy_id:
      input?.discussion_board_data_retention_policy_id ??
      typia.random<string & tags.Format<"uuid">>(),
    data_type:
      input?.data_type ??
      RandomGenerator.pick([
        "user_profiles",
        "article_content",
        "comment_data",
        "audit_logs",
      ] as const),
  };
}
