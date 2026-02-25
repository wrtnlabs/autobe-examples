import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditFeedSortingOption";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_sorting_change_top_to_controversial(
  connection: api.IConnection,
): Promise<void> {
  // Update sorting to Controversial
  const result = await api.functional.reddit.sort_options.index(connection, {
    body: {
      sort_type: "controversial",
      page: 1,
      limit: 10,
    } satisfies IRedditFeedSortingOption.IRequest,
  });
  typia.assert(result);
  // Validate response structure
  TestValidator.equals(
    "Response should contain correct sorting type",
    result.data[0].sort_type,
    "controversial",
  );
  TestValidator.predicate(
    "Controversial sort type should be used",
    result.data.some((d) => d.sort_type === "controversial"),
  );
}
