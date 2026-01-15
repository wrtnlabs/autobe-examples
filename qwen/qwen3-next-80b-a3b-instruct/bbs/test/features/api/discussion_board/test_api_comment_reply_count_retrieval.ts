import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IDiscussionBoardNumberValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNumberValue";
export async function test_api_comment_reply_count_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for parent comment
  const parentCommentId = typia.random<string & tags.Format<"uuid">>();
  // Call the endpoint to retrieve reply count
  const replyCount: IDiscussionBoardNumberValue =
    await api.functional.discussionBoard.comments.replies.count.index(
      connection,
      {
        commentId: parentCommentId,
      },
    );
  // Validate the response structure and type safety
  typia.assert(replyCount);
  // Verify the value is a non-negative integer
  TestValidator.predicate("reply count is non-negative", replyCount.value >= 0);
}
