import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";

export async function test_api_post_public_retrieval(
  connection: api.IConnection,
) {
  const postId: string = typia.random<string & tags.Format<"uuid">>();
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.posts.at(connection, {
      postId,
    });
  typia.assert(post);
}
