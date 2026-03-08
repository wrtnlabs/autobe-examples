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

export async function test_api_comment_revision_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test successful retrieval of comment revision history
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve revision history for the comment
  const revisions = await api.functional.redditLike.comments.revisions.at(
    connection,
    {
      commentId,
    },
  );
  // Validate response structure
  typia.assert(revisions);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    revisions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    revisions.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    revisions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    revisions.pagination.pages >= 0,
  );
  // Validate revision data structure if revisions exist
  if (revisions.data.length > 0) {
    for (const revision of revisions.data) {
      typia.assert<IRedditLikeCommentRevision.ISummary>(revision);
      TestValidator.equals(
        "revision has uuid id",
        typeof revision.id,
        "string",
      );
      TestValidator.equals(
        "revision has comment_id",
        typeof revision.comment_id,
        "string",
      );
      TestValidator.equals(
        "revision has content as string",
        typeof revision.content,
        "string",
      );
      TestValidator.equals(
        "revision has date-time format",
        typeof revision.created_at,
        "string",
      );
    }
  }
  // Test error handling for non-existent comment
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return error for non-existent comment",
    async () => {
      await api.functional.redditLike.comments.revisions.at(connection, {
        commentId: nonExistentCommentId,
      });
    },
  );
}
