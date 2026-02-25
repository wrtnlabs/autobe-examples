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

export async function test_api_feed_sorting_change_hot_to_new(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  const result = await api.functional.reddit.sort_options.index(
    userConnection,
    {
      body: {
        sort_type: "new",
      } satisfies IRedditFeedSortingOption.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "feed sorting preference updated to 'new'",
    result.data[0].sort_type,
    "new",
  );
}
