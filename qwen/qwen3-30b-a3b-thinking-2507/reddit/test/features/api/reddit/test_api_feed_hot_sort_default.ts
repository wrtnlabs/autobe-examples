import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditFeed";
import type { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_hot_sort_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve the public feed with default sort ("hot")
  const output: IPageIRedditFeed.ISummary =
    await api.functional.reddit.feeds.index(connection, {
      body: {
        sort: "hot",
      } satisfies IRedditFeed.IRequest,
    });
  typia.assert(output);
  // 2. Verify pagination defaults to 20 items per page
  TestValidator.equals("Pagination default limit", output.pagination.limit, 20);
  // 3. Verify sort type is "hot" in response
  TestValidator.equals(
    "Sorting type is hot",
    output.data[0]?.sortingOption.sort_type,
    "hot",
  );
  // 4. Verify that there are items returned
  TestValidator.predicate("Response contains items", output.data.length > 0);
}
