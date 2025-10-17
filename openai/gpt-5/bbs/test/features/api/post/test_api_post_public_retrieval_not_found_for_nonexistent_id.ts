import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";

/**
 * Ensure public retrieval of a non-existent post fails without leaking details.
 *
 * Scenario
 *
 * 1. Generate a random UUID that does not correspond to any existing post.
 * 2. Call GET /econDiscuss/posts/{postId} with that UUID.
 * 3. Expect the operation to fail (not-found). Do not assert precise HTTP status
 *    or error payload; only validate that an error is thrown.
 */
export async function test_api_post_public_retrieval_not_found_for_nonexistent_id(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "requesting a non-existent post should result in an error",
    async () => {
      await api.functional.econDiscuss.posts.at(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
