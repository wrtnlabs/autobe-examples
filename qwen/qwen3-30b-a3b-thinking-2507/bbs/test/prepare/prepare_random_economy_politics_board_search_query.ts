import { IEconomyPoliticsBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economy_politics_board_search_query(
  input?: DeepPartial<IEconomyPoliticsBoardSearchQuery.ICreate>,
): IEconomyPoliticsBoardSearchQuery.ICreate {
  return {
    search_term: input?.search_term ?? RandomGenerator.name(),
    request_parameters:
      input?.request_parameters ??
      JSON.stringify({
        searchCriteria: RandomGenerator.name(),
        category: RandomGenerator.pick([
          "economy",
          "politics",
          "foreign-policy",
        ]),
      }),
  };
}
