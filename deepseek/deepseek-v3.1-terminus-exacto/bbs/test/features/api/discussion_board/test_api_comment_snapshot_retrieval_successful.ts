import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of a comment snapshot for audit trail purposes.
 * Since we only have the snapshot retrieval endpoint available, we'll test
 * retrieving a snapshot using valid UUID parameters to verify the endpoint
 * functionality and response structure.
 */
export async function test_api_comment_snapshot_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create valid UUID parameters for the snapshot retrieval
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the snapshot using the available endpoint
  const snapshot =
    await api.functional.discussionBoard.articles.comments.snapshots.at(
      connection,
      {
        articleId,
        commentId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate the snapshot response structure
  TestValidator.predicate(
    "snapshot has valid ID",
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );
  TestValidator.predicate(
    "version number is integer",
    Number.isInteger(snapshot.version_number),
  );
  TestValidator.predicate(
    "comment content exists",
    typeof snapshot.comment_content === "string",
  );
  TestValidator.predicate(
    "created at timestamp valid",
    new Date(snapshot.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "comment created at timestamp valid",
    new Date(snapshot.comment_created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "comment updated at timestamp valid",
    new Date(snapshot.comment_updated_at).getTime() > 0,
  );
  // Validate nested comment structure
  TestValidator.predicate(
    "comment summary has valid ID",
    typeof snapshot.comment.id === "string" && snapshot.comment.id.length > 0,
  );
  TestValidator.predicate(
    "comment summary has content",
    typeof snapshot.comment.content === "string",
  );
  TestValidator.predicate(
    "comment summary has author",
    typeof snapshot.comment.author.id === "string" &&
      snapshot.comment.author.id.length > 0,
  );
  // Validate nested user structure
  TestValidator.predicate(
    "user summary has valid ID",
    typeof snapshot.user.id === "string" && snapshot.user.id.length > 0,
  );
  TestValidator.predicate(
    "user has display name",
    typeof snapshot.user.display_name === "string",
  );
  TestValidator.predicate(
    "user has creation timestamp",
    new Date(snapshot.user.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "user has update timestamp",
    new Date(snapshot.user.updated_at).getTime() > 0,
  );
}
