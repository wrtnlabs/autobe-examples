import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_view_public_access(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for testing public post view
  const testPostId = typia.random<string & tags.Format<"uuid">>();
  // Create unauthenticated connection for public access test
  const publicConnection: api.IConnection = { host: connection.host };
  // Test public access to post without authentication
  await TestValidator.error("non-existent post returns 404", async () => {
    await api.functional.redditLike.posts.at(publicConnection, {
      postId: testPostId,
    });
  });
}
