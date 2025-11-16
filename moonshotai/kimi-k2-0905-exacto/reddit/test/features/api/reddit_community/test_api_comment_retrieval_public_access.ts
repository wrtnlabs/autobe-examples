import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

export async function test_api_comment_retrieval_public_access(
  connection: api.IConnection,
) {
  // Step 1: Generate a random comment ID using UUID format
  const commentId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Call the API to retrieve comment details
  const comment = await api.functional.redditCommunity.comments.at(connection, {
    commentId: commentId,
  });

  // Step 3: Validate response type and completeness
  typia.assert(comment);

  // Step 4: Validate core comment fields are present
  TestValidator.predicate(
    "comment id is valid UUID",
    typia.is<string & tags.Format<"uuid">>(comment.id),
  );
  TestValidator.predicate(
    "comment content is string",
    typeof comment.content === "string",
  );
  TestValidator.predicate(
    "upvote count is non-negative integer",
    typia.is<number & tags.Type<"int32"> & tags.Minimum<0>>(
      comment.upvote_count,
    ),
  );
  TestValidator.predicate(
    "downvote count is non-negative integer",
    typia.is<number & tags.Type<"int32"> & tags.Minimum<0>>(
      comment.downvote_count,
    ),
  );
  TestValidator.predicate(
    "thread depth is non-negative integer",
    typia.is<number & tags.Type<"int32"> & tags.Minimum<0>>(
      comment.thread_depth,
    ),
  );
  TestValidator.predicate(
    "is_deleted is boolean",
    typeof comment.is_deleted === "boolean",
  );
  TestValidator.predicate(
    "is_removed is boolean",
    typeof comment.is_removed === "boolean",
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    typia.is<string & tags.Format<"date-time">>(comment.created_at),
  );

  // Step 5: Validate author information is present (even for deleted content)
  TestValidator.predicate(
    "author information exists",
    typeof comment.author === "object",
  );
  TestValidator.predicate(
    "author id is valid UUID",
    typia.is<string & tags.Format<"uuid">>(comment.author.id),
  );
  TestValidator.predicate(
    "author nickname is string",
    typeof comment.author.nickname === "string",
  );
  TestValidator.predicate(
    "author email is string",
    typeof comment.author.email === "string",
  );

  // Step 6: Validate post reference is present
  TestValidator.predicate(
    "post information exists",
    typeof comment.post === "object",
  );
  TestValidator.predicate(
    "post id is valid UUID",
    typia.is<string & tags.Format<"uuid">>(comment.post.id),
  );
  TestValidator.predicate(
    "post title is string",
    typeof comment.post.title === "string",
  );

  // Step 7: Handle optional parent comment (threading)
  if (comment.parent_comment !== null && comment.parent_comment !== undefined) {
    TestValidator.predicate(
      "parent comment exists",
      comment.parent_comment !== null && comment.parent_comment !== undefined,
    );

    TestValidator.predicate(
      "parent comment id is valid UUID",
      typia.is<string & tags.Format<"uuid">>(comment.parent_comment.id),
    );
    TestValidator.predicate(
      "parent comment content is string",
      typeof comment.parent_comment.content === "string",
    );
  }
}
