import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving a non-existent post returns 404 Not Found.
 *
 * This test validates that the post retrieval endpoint gracefully handles
 * requests for posts that do not exist in the database. It generates a
 * valid UUID format string that does not correspond to any existing post
 * and verifies that the API returns an appropriate 404 Not Found response.
 */
export async function test_api_post_retrieve_non_existent_post_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid UUID format string that does not exist in the database
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Verify that retrieving a non-existent post throws 404 HTTP error
  await TestValidator.httpError(
    "should return 404 for non-existent post",
    404,
    async () => {
      await api.functional.redditClone.posts.at(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
