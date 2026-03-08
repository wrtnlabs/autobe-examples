import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_section(
  input?: DeepPartial<IDiscussionBoardSection.ICreate> | undefined,
): IDiscussionBoardSection.ICreate {
  return {
    name: input?.name ?? RandomGenerator.paragraph({ wordMin: 1, wordMax: 3 }),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 7 }),
  };
}
