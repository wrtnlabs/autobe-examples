import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_community(
  connection: IConnection,
): Promise<void> {
  const feedConnection: IConnection = { host: connection.host };
  const feedId = typia.random<string & tags.Format<"uuid">>();
  const feed = await api.functional.reddit.feeds.at(feedConnection, { feedId });
  typia.assert(feed);
  TestValidator.equals(
    "Feed type should be 'Community'",
    feed.type,
    "Community",
  );
  TestValidator.equals(
    "Visibility rules should be 'Public'",
    feed.visibility_rules,
    "Public",
  );
}
