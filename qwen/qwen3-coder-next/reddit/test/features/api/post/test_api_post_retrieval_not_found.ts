import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection (connection isolation pattern)
  const actorConnection: api.IConnection = { host: connection.host };
  // Test retrieval of a non-existent post using an invalid UUID
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  try {
    await api.functional.redditPlatform.posts.at(actorConnection, {
      postId: nonExistentId,
    });
    throw new Error("Expected an error to be thrown for non-existent post");
  } catch (error) {
    // Verify it's an HttpError with 404 status
    TestValidator.httpError(
      "should return 404 for non-existent post",
      404,
      () => {
        throw error;
      },
    );
  }
}
