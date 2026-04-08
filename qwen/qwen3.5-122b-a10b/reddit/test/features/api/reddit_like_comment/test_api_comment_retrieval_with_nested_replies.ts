import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeComment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving comments with nested reply structures on a post.
 *
 * Validates that the comment retrieval endpoint properly returns nested comment structures where each comment can contain a replies array with child comments, supporting unlimited nesting depth for threaded discussions. The test authenticates as a member, retrieves comments from a post with various sorting options, and verifies the response structure maintains proper nesting relationships.
 *
 * Key validation points:
 * 1. Member authentication succeeds with valid credentials
 * 2. Comment retrieval endpoint returns paginated results with correct structure
 * 3. Each comment summary includes the replies array for nested structure
 * 4. Pagination metadata is correctly populated
 * 5. Different sorting options (best, new, controversial) are supported
 * 6. Author information is properly joined and included in each comment
 * 7. Vote scores are computed and included
 * 8. Timestamps are in correct ISO 8601 format
 */
export async function test_api_comment_retrieval_with_nested_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Generate a random post ID (simulating an existing post)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test comment retrieval with default parameters
  const response1: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          sort: "best",
          limit: 20,
        },
      },
    );
  typia.assert(response1);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination current page is non-negative",
    response1.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination limit is non-negative",
    response1.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination records is non-negative",
    response1.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages is non-negative",
    response1.pagination.pages >= 0,
    true,
  );
  // 5. Validate each comment has required structure with nested replies
  await ArrayUtil.asyncForEach(response1.data, async (comment) => {
    // Validate comment ID is UUID format
    typia.assert(comment.id);
    // Validate author information is present
    TestValidator.predicate("author has id", comment.author.id.length > 0);
    TestValidator.predicate(
      "author has username",
      comment.author.username.length > 0,
    );
    TestValidator.predicate(
      "author has karma score",
      typeof comment.author.karma_score === "number",
    );
    // Validate comment content
    TestValidator.predicate("comment has content", comment.content.length > 0);
    // Validate vote score is a number
    TestValidator.predicate(
      "vote score is number",
      typeof comment.vote_score === "number",
    );
    // Validate timestamps are in ISO 8601 format
    typia.assert(comment.created_at);
    typia.assert(comment.updated_at);
    // Validate replies array exists and is an array
    TestValidator.predicate("replies is array", Array.isArray(comment.replies));
    // Validate each reply has the same structure (recursive validation)
    await ArrayUtil.asyncForEach(comment.replies, async (reply) => {
      typia.assert(reply.id);
      TestValidator.predicate("reply has author", reply.author.id.length > 0);
      TestValidator.predicate("reply has content", reply.content.length > 0);
      TestValidator.predicate(
        "reply has vote score",
        typeof reply.vote_score === "number",
      );
      TestValidator.predicate(
        "reply replies is array",
        Array.isArray(reply.replies),
      );
    });
  });
  // 6. Test with "new" sorting option
  const response2: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          sort: "new",
          limit: 10,
        },
      },
    );
  typia.assert(response2);
  // 7. Test with "controversial" sorting option
  const response3: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          sort: "controversial",
          limit: 15,
        },
      },
    );
  typia.assert(response3);
  // 8. Test pagination with cursor (using empty cursor for first page)
  const response4: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          cursor: undefined,
          limit: 5,
        },
      },
    );
  typia.assert(response4);
  // 9. Test page-based pagination
  const response5: IPageIRedditLikeComment.ISummary =
    await api.functional.redditLike.member.posts.comments.index(
      memberConnection,
      {
        postId,
        body: {
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response5);
  // 10. Validate that all responses have consistent structure
  TestValidator.predicate(
    "all responses have data array",
    Array.isArray(response1.data) &&
      Array.isArray(response2.data) &&
      Array.isArray(response3.data) &&
      Array.isArray(response4.data) &&
      Array.isArray(response5.data),
  );
}
