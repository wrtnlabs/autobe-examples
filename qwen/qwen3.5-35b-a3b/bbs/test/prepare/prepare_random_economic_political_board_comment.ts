import { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_political_board_comment(
  input?: DeepPartial<IEconomicPoliticalBoardComment.ICreate>,
): IEconomicPoliticalBoardComment.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 5,
        wordMin: 8,
        wordMax: 12,
      }),
  };
}
