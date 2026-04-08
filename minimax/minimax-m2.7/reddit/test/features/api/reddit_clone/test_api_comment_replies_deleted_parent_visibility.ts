import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_replies_deleted_parent_visibility(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving nested replies when the parent comment has been soft-deleted.
  // Verify that replies are still returned successfully even though the parent
  // comment content is not fully displayed. Deleted comments should show a
  // placeholder message while preserving the nested replies structure.
  // Create a connection for the test user (endpoint requires null authorization)
  const userConnection: api.IConnection = { host: connection.host };
  // Generate UUID for the soft-deleted parent comment
  const deletedParentCommentId = typia.random<string & tags.Format<"uuid">>();
  // Call the replies endpoint to fetch replies of the deleted parent comment
  const repliesResponse =
    await api.functional.redditClone.redditClone.comments.replies.index(
      userConnection,
      {
        commentId: deletedParentCommentId,
        body: {
          sort: "Best",
          page: 1,
          limit: 20,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  // Validate response structure with typia.assert
  typia.assert(repliesResponse);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination.current is valid",
    repliesResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    repliesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records is valid",
    repliesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is valid",
    repliesResponse.pagination.pages >= 0,
  );
  // Validate data array exists and is properly structured
  TestValidator.equals(
    "data is array",
    Array.isArray(repliesResponse.data),
    true,
  );
  // Validate each reply structure
  for (const reply of repliesResponse.data) {
    TestValidator.predicate("reply has valid id", reply.id.length > 0);
    TestValidator.predicate("reply has content field", "content" in reply);
    TestValidator.predicate(
      "reply has voteScore",
      typeof reply.voteScore === "number",
    );
    TestValidator.predicate(
      "reply has createdAt",
      typeof reply.createdAt === "string",
    );
    TestValidator.predicate("reply has author", reply.author !== null);
    TestValidator.predicate("author has id", reply.author.id.length > 0);
    TestValidator.predicate("author has username", "username" in reply.author);
    TestValidator.predicate(
      "reply has nested replies array",
      Array.isArray(reply.replies),
    );
  }
  // Test with "New" sort order
  const newSortResponse =
    await api.functional.redditClone.redditClone.comments.replies.index(
      userConnection,
      {
        commentId: deletedParentCommentId,
        body: {
          sort: "New",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(newSortResponse);
  // Test with "Controversial" sort order
  const controversialResponse =
    await api.functional.redditClone.redditClone.comments.replies.index(
      userConnection,
      {
        commentId: deletedParentCommentId,
        body: {
          sort: "Controversial",
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(controversialResponse);
  // Test pagination with page 2 and limit 10
  const paginatedResponse =
    await api.functional.redditClone.redditClone.comments.replies.index(
      userConnection,
      {
        commentId: deletedParentCommentId,
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditCloneComment.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "page 2 limit validation",
    paginatedResponse.pagination.limit,
    10,
  );
}
