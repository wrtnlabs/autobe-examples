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
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    description:
      input?.description ??
      (input !== undefined && input.description === null
        ? null
        : RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            wordMin: 4,
            wordMax: 8,
          })) ??
      null,
  };
}