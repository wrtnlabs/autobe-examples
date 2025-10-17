import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";

export async function test_api_post_retrieval_missing_id(
  connection: api.IConnection,
) {
  // Generate a completely random UUID that does not correspond to any existing post
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve a post using the non-existent UUID
  // According to the scenario, this should return HTTP 404 Not Found
  // The API function at expects postId parameter in the path
  // No request body is needed for GET request
  await TestValidator.error(
    "retrieving non-existent post should fail with 404",
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
