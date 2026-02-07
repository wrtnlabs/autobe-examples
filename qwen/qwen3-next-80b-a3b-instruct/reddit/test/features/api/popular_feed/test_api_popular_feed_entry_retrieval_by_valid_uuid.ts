import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPostFeed } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPostFeed";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_entry_retrieval_by_valid_uuid(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for the popular feed entry
  const feedId = typia.random<string & tags.Format<"uuid">>();
  // Create a connection for the request (isolated from base connection)
  const userConnection: api.IConnection = { host: connection.host };
  // Call the API function to retrieve the popular feed entry
  const feedEntry = await api.functional.community.popular_feeds.at(
    userConnection,
    {
      id: feedId,
    },
  );
  // Validate the response type using typia.assert
  typia.assert(feedEntry);
  // Assert that the returned object is an empty object as per ICommunityPostFeed definition
  // No properties should exist in ICommunityPostFeed, so we verify it's an object
  TestValidator.predicate(
    "returned object is empty",
    Object.keys(feedEntry).length === 0,
  );
}
