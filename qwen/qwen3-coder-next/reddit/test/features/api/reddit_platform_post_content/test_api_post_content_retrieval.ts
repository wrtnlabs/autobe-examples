import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of post content for a Reddit-like platform.
 * Tests the content endpoint with a valid post ID and verifies the response
 * contains the expected content structure.
 */
export async function test_api_post_content_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid UUID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Test successful content retrieval with valid post ID
  const content = await api.functional.redditPlatform.posts.content.at(
    connection,
    {
      postId: postId,
    },
  );
  typia.assert(content);
  // Validate the content structure is correct
  // IRedditPlatformPost.IContent is an empty type {} as per DTO definitions
  // The content should be a valid object
  TestValidator.predicate("content is object", typeof content === "object");
  // Test error handling for non-existent post
  await TestValidator.error("non-existent post returns error", async () => {
    await api.functional.redditPlatform.posts.content.at(connection, {
      postId: "00000000-0000-0000-0000-000000000000",
    });
  });
}
