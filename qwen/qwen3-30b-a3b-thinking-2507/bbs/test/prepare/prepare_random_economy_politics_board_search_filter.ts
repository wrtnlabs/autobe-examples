import { IEconomyPoliticsBoardSearchFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSearchFilter";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_economy_politics_board_search_filter(
  input?: DeepPartial<IEconomyPoliticsBoardSearchFilter.ICreate>,
): IEconomyPoliticsBoardSearchFilter.ICreate {
  return {
    filter_name: input?.filter_name ?? RandomGenerator.name(),
    config:
      input?.config ??
      JSON.stringify({
        tags: ["economy", "politics", "finance", "regulation"],
        recent: Math.random() > 0.5,
        categories: ["finance", "policy", "market"],
        timeFrame: "last_month",
        minPrice: Math.floor(Math.random() * 1000),
        maxPrice: Math.floor(Math.random() * 5000),
      }),
  };
}
