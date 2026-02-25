import { IEconomicBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economic_board_comment(
  input?: DeepPartial<IEconomicBoardComment.ICreate>,
): IEconomicBoardComment.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
  };
}
