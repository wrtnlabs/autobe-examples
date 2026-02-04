import { IEconPoliticBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_econ_politic_board_system_config(
  input?: DeepPartial<IEconPoliticBoardSystemConfig.ICreate> | undefined,
): IEconPoliticBoardSystemConfig.ICreate {
  return {
    key:
      input?.key ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<50>
        >(),
      ),
    value:
      input?.value ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<4>
        >(),
        sentenceMin: 5,
        sentenceMax: 15,
        wordMin: 3,
        wordMax: 7,
      }),
  };
}
