import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_get_details(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the API call (Connection Isolation Pattern)
  const testConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID for postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Call the post detail endpoint
  const post = await api.functional.redditClone.posts.at(testConnection, {
    postId: postId,
  });
  typia.assert(post);
}
