import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_sorting_hot_formula(
  connection: api.IConnection,
): Promise<void> {
  const sortOptionId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.reddit.sort_options.at(connection, {
    sortOptionId,
  });
  typia.assert(response);
  TestValidator.equals("sort_type should be 'hot'", response.sort_type, "hot");
  TestValidator.equals(
    "formula should match business rule",
    response.formula,
    "votes * 1/(HoursSincePost + 1)",
  );
}
