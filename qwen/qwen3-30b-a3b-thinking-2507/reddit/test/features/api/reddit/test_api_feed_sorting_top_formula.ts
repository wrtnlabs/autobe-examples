import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_sorting_top_formula(
  connection: api.IConnection,
): Promise<void> {
  const sortOption = await api.functional.reddit.sort_options.at(connection, {
    sortOptionId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(sortOption);
  TestValidator.equals(
    "sort_type should be 'top'",
    sortOption.sort_type,
    "top",
  );
  TestValidator.equals(
    "formula should match 'top vote score filtered by time period'",
    sortOption.formula,
    "top vote score filtered by time period",
  );
}
