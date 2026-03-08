import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommentRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommentRevision";
import type { IRedditLikeCommentRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommentRevision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_revision_history_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random comment ID that likely has no revisions
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve revision history for a comment with no revisions
  const revisions = await api.functional.redditLike.comments.revisions.at(
    connection,
    {
      commentId,
    },
  );
  typia.assert(revisions);
  // Validate pagination structure
  TestValidator.equals("current page is 1", revisions.pagination.current, 1);
  TestValidator.equals("limit is 10", revisions.pagination.limit, 10);
  TestValidator.equals("record count is 0", revisions.pagination.records, 0);
  TestValidator.equals("pages count is 0", revisions.pagination.pages, 0);
  // Validate empty data array
  TestValidator.equals("no revisions", revisions.data.length, 0);
}
