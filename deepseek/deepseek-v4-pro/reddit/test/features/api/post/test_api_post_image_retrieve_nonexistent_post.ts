import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting an image for a non-existent post returns a 404 error.
 *
 * Validates that the publicly accessible image retrieval endpoint properly rejects requests for posts that do not exist. A randomly generated UUID that does not correspond to any existing post is used to trigger the expected 404 response.
 *
 * No authentication or pre-existing data is required since the endpoint is publicly accessible by design.
 *
 * 1. Generate a random UUID that does not correspond to any existing post.
 * 2. Call the GET /communityHub/posts/{postId}/image endpoint with the random ID.
 * 3. Verify the request is rejected with a 404 Not Found error.
 */
export async function test_api_post_image_retrieve_nonexistent_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random, non-existent post ID
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  // 2-3. Call endpoint and verify 404 error
  await TestValidator.httpError(
    "requesting image for non-existent post returns 404",
    404,
    async () =>
      await api.functional.communityHub.posts.image(connection, {
        postId: nonExistentPostId,
      }),
  );
}
