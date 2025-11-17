import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";

export async function test_api_post_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  // Verify that retrieving a non-existent post returns HTTP 404 Not Found
  await TestValidator.httpError(
    "non-existent post ID should return 404 Not Found",
    404,
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postId: nonExistentPostId,
      });
    },
  );
}
