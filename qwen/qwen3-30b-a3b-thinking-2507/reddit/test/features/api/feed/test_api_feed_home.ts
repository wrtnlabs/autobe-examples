import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeed";
import type { IRedditFeedSortingOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditFeedSortingOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_feed_home(connection: api.IConnection) {
  const output: IRedditFeed = await api.functional.reddit.feeds.at(connection, {
    feedId: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
  TestValidator.equals("type is Home", output.type, "Home");
  TestValidator.equals(
    "visibility_rules is Public",
    output.visibility_rules,
    "Public",
  );
}
