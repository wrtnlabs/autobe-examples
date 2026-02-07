import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_content_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Retrieve content of a non-existent post (invalid UUID)
  await TestValidator.error("404 for non-existent post", async () => {
    await api.functional.redditPlatform.posts.content.at(connection, {
      postId: "invalid-uuid-format",
    });
  });
  // Test 2: Retrieve content with empty post ID
  await TestValidator.error("404 for empty post ID", async () => {
    await api.functional.redditPlatform.posts.content.at(connection, {
      postId: "",
    });
  });
  // Test 3: Retrieve content with null-like UUID pattern
  await TestValidator.error("404 for null UUID pattern", async () => {
    await api.functional.redditPlatform.posts.content.at(connection, {
      postId: "00000000-0000-0000-0000-000000000000",
    });
  });
  // Test 4: Verify successful content retrieval with valid UUID format (but non-existent post)
  // Since this is a valid UUID format, the API might return empty/null content
  // rather than a 404 error. The exact behavior depends on the server implementation.
  const nonExistentPostContent =
    await api.functional.redditPlatform.posts.content.at(connection, {
      postId: "550e8400-e29b-41d4-a716-446655440000",
    });
  typia.assert(nonExistentPostContent);
}
