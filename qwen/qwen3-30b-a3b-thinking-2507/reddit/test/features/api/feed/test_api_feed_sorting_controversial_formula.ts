import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_sorting_controversial_formula(
  connection: api.IConnection,
): Promise<void> {
  const sortingOption = await api.functional.reddit.sort_options.at(
    connection,
    {
      sortOptionId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(sortingOption);
  TestValidator.equals("sort_type", sortingOption.sort_type, "controversial");
  TestValidator.equals(
    "formula",
    sortingOption.formula,
    "high vote count near zero score",
  );
}
