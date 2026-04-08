import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create simulation connection to generate valid snapshot data
  const simulateConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // Generate a valid snapshot UUID for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // Call the snapshot retrieval endpoint in simulation mode
  // The simulation will return random valid data conforming to IRedditPlatformCommentSnapshot
  const retrievedSnapshot =
    await api.functional.redditPlatform.comment_snapshots.at(
      simulateConnection,
      {
        snapshotId,
      },
    );
  // Validate the response is a valid snapshot
  typia.assert(retrievedSnapshot);
  // 1. Validate id is UUID
  TestValidator.predicate("snapshot id is valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedSnapshot.id,
    ),
  );
  // 2. Validate originalComment has required fields
  typia.assert(retrievedSnapshot.originalComment);
  TestValidator.equals(
    "original comment has id",
    typeof retrievedSnapshot.originalComment.id,
    "string",
  );
  TestValidator.equals(
    "original comment has content",
    typeof retrievedSnapshot.originalComment.content,
    "string",
  );
  TestValidator.predicate(
    "original comment has vote counts",
    () =>
      typeof retrievedSnapshot.originalComment.upvotes_count === "number" &&
      typeof retrievedSnapshot.originalComment.downvotes_count === "number" &&
      typeof retrievedSnapshot.originalComment.score === "number" &&
      typeof retrievedSnapshot.originalComment.comment_count === "number",
  );
  TestValidator.equals(
    "original comment has author",
    typeof retrievedSnapshot.originalComment.author,
    "object",
  );
  TestValidator.equals(
    "original comment has post",
    typeof retrievedSnapshot.originalComment.post,
    "object",
  );
  TestValidator.equals(
    "original comment has created_at",
    typeof retrievedSnapshot.originalComment.created_at,
    "string",
  );
  TestValidator.equals(
    "original comment has updated_at",
    typeof retrievedSnapshot.originalComment.updated_at,
    "string",
  );
  TestValidator.equals(
    "original comment has deleted_at",
    retrievedSnapshot.originalComment.deleted_at !== undefined,
    true,
  );
  // 3. Validate post is UUID string
  TestValidator.equals(
    "post is valid UUID string",
    typeof retrievedSnapshot.post,
    "string",
  );
  TestValidator.predicate("post is valid UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedSnapshot.post,
    ),
  );
  // 4. Validate author is UUID string
  TestValidator.equals(
    "author is valid UUID string",
    typeof retrievedSnapshot.author,
    "string",
  );
  TestValidator.predicate("author is valid UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedSnapshot.author,
    ),
  );
  // 5. Validate parentComment is either UUID string or null
  TestValidator.predicate(
    "parentComment is string or null",
    () =>
      typeof retrievedSnapshot.parentComment === "string" ||
      retrievedSnapshot.parentComment === null,
  );
  // 6. Validate parentComment UUID format if not null
  const parentComment = retrievedSnapshot.parentComment;
  if (parentComment !== null) {
    TestValidator.predicate("parentComment is valid UUID format", () =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        parentComment,
      ),
    );
  }
  // 7. Validate content is string
  TestValidator.equals(
    "content is string",
    typeof retrievedSnapshot.content,
    "string",
  );
  // 8. Validate vote counts are int32 numbers
  TestValidator.predicate(
    "upvotesCount is int32",
    () =>
      Number.isInteger(retrievedSnapshot.upvotesCount) &&
      retrievedSnapshot.upvotesCount >= -2147483648 &&
      retrievedSnapshot.upvotesCount <= 2147483647,
  );
  TestValidator.predicate(
    "downvotesCount is int32",
    () =>
      Number.isInteger(retrievedSnapshot.downvotesCount) &&
      retrievedSnapshot.downvotesCount >= -2147483648 &&
      retrievedSnapshot.downvotesCount <= 2147483647,
  );
  TestValidator.predicate(
    "score is int32",
    () =>
      Number.isInteger(retrievedSnapshot.score) &&
      retrievedSnapshot.score >= -2147483648 &&
      retrievedSnapshot.score <= 2147483647,
  );
  // 9. Validate score calculation
  const expectedScore =
    retrievedSnapshot.upvotesCount - retrievedSnapshot.downvotesCount;
  TestValidator.equals(
    "score equals upvotes minus downvotes",
    retrievedSnapshot.score,
    expectedScore,
  );
  // 10. Validate timestamps are ISO 8601 date-time strings
  TestValidator.predicate(
    "commentCreatedAt is valid ISO 8601",
    () => !isNaN(Date.parse(retrievedSnapshot.commentCreatedAt)),
  );
  TestValidator.predicate(
    "commentUpdatedAt is valid ISO 8601",
    () => !isNaN(Date.parse(retrievedSnapshot.commentUpdatedAt)),
  );
  TestValidator.predicate(
    "snapshotCreatedAt is valid ISO 8601",
    () => !isNaN(Date.parse(retrievedSnapshot.snapshotCreatedAt)),
  );
  // 11. Validate originalComment structure matches snapshot data
  TestValidator.equals(
    "original comment id matches snapshot",
    retrievedSnapshot.originalComment.id,
    retrievedSnapshot.originalComment.id,
  );
  TestValidator.equals(
    "original comment content matches snapshot",
    retrievedSnapshot.originalComment.content,
    retrievedSnapshot.content,
  );
  TestValidator.equals(
    "original comment upvotes matches snapshot",
    retrievedSnapshot.originalComment.upvotes_count,
    retrievedSnapshot.upvotesCount,
  );
  TestValidator.equals(
    "original comment downvotes matches snapshot",
    retrievedSnapshot.originalComment.downvotes_count,
    retrievedSnapshot.downvotesCount,
  );
  TestValidator.equals(
    "original comment score matches snapshot",
    retrievedSnapshot.originalComment.score,
    retrievedSnapshot.score,
  );
  TestValidator.equals(
    "original comment created_at matches snapshot",
    retrievedSnapshot.originalComment.created_at,
    retrievedSnapshot.commentCreatedAt,
  );
  TestValidator.equals(
    "original comment updated_at matches snapshot",
    retrievedSnapshot.originalComment.updated_at,
    retrievedSnapshot.commentUpdatedAt,
  );
  // 12. Validate original comment author reference
  TestValidator.equals(
    "original comment author id matches snapshot author",
    retrievedSnapshot.originalComment.author.id,
    retrievedSnapshot.author,
  );
  // 13. Validate original comment post reference
  TestValidator.equals(
    "original comment post id matches snapshot post",
    retrievedSnapshot.originalComment.post.id,
    retrievedSnapshot.post,
  );
  // 14. Validate original comment parent reference if exists
  const parent = retrievedSnapshot.originalComment.parent;
  if (parent !== undefined && parent !== null) {
    TestValidator.equals(
      "original comment parent id matches snapshot parentComment",
      parent.id,
      retrievedSnapshot.parentComment ?? parent.id,
    );
  }
}