import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_popular(
  connection: api.IConnection,
): Promise<void> {
  const feedId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.reddit.feeds.at(connection, {
    feedId,
  });
  typia.assert(response);
  TestValidator.equals("Type is 'Popular'", response.type, "Popular");
  TestValidator.equals(
    "Visibility is 'Public'",
    response.visibility_rules,
    "Public",
  );
  TestValidator.equals(
    "Sorting option sort_type is 'Hot'",
    response.sortingOption.sort_type,
    "Hot",
  );
}
