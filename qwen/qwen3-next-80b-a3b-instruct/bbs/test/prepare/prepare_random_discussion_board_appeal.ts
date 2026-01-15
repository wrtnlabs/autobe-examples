import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAppeal";
export function prepare_random_discussion_board_appeal(
  input?: DeepPartial<IDiscussionBoardAppeal.ICreate>,
): IDiscussionBoardAppeal.ICreate {
  return {
    moderation_action_id:
      input?.moderation_action_id ??
      typia.random<string & tags.Format<"uuid">>(),
    justification:
      input?.justification ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<7>
        >(),
        wordMin: 5,
        wordMax: 12,
      }),
  };
}
