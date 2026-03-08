import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a comment ID that might exist (this is for validation purposes only)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the comment
  const output = await api.functional.redditLike.comments.at(connection, {
    commentId,
  });
  // Validate the response structure
  typia.assert(output);
  // Validate comment structure including all required fields
  TestValidator.equals("comment has id", typeof output.id, "string");
  TestValidator.equals("comment has content", typeof output.content, "string");
  TestValidator.equals(
    "comment has vote_score",
    typeof output.vote_score,
    "number",
  );
  TestValidator.equals(
    "comment has created_at",
    typeof output.created_at,
    "string",
  );
  TestValidator.equals(
    "comment has updated_at",
    typeof output.updated_at,
    "string",
  );
  // Validate deleted_at field - it should be either a date-time string or null
  TestValidator.predicate("deleted_at is valid or null", () => {
    if (output.deleted_at === null) {
      return true;
    }
    const date = new Date(output.deleted_at);
    return !isNaN(date.getTime());
  });
  // Validate author exists
  TestValidator.equals("author has id", typeof output.author.id, "string");
  TestValidator.equals(
    "author has entity_type",
    ["post", "comment", "community"].includes(output.author.entity_type),
    true,
  );
  // Validate post summary exists
  TestValidator.equals("post has id", typeof output.post.id, "string");
  TestValidator.equals("post has title", typeof output.post.title, "string");
  TestValidator.equals(
    "post has author",
    typeof output.post.author.id,
    "string",
  );
  TestValidator.equals(
    "post has community",
    typeof output.post.community.id,
    "string",
  );
}
