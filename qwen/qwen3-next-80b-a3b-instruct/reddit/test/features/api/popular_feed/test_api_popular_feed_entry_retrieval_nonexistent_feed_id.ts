import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostFeed";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_entry_retrieval_nonexistent_feed_id(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID format that does not exist in the database
  const nonexistentFeedId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent popular feed entry
  await TestValidator.httpError(
    "nonexistent feed id returns 404",
    404,
    async () => {
      await api.functional.community.popular_feeds.at(userConnection, {
        id: nonexistentFeedId,
      });
    },
  );
}
