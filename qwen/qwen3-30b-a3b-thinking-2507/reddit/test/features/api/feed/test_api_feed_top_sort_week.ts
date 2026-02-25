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

export async function test_api_feed_top_sort_week(
  connection: api.IConnection,
): Promise<void> {
  const apiConnection: api.IConnection = { host: connection.host };
  const response = await api.functional.reddit.feeds.index(apiConnection, {
    body: {
      sort: "top",
      timeFilter: "week",
      limit: 20,
      page: 1,
    },
  });
  typia.assert(response);
  TestValidator.predicate("Should have data", response.data.length > 0);
  TestValidator.equals(
    "Sorting type should be top",
    response.data[0].sortingOption.sort_type,
    "top",
  );
  TestValidator.equals("Page size should be 20", response.pagination.limit, 20);
}
