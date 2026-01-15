import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfig";
export function prepare_random_discussion_board_config(
  input?: DeepPartial<IDiscussionBoardConfig.ICreate>,
): IDiscussionBoardConfig.ICreate {
  return {
    key:
      input?.key ??
      typia.random<
        string &
          tags.MinLength<1> &
          tags.MaxLength<50> &
          tags.Pattern<"^[a-z_]+$">
      >(),
    value:
      input?.value ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
        wordMin: 5,
        wordMax: 10,
      }),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
