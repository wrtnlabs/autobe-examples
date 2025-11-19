import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate soft-delete (logical deletion) functionality for self-authored
 * discussion board comments.
 *
 * This test covers the complete happy-path lifecycle for a user to register,
 * create a comment, perform soft deletion, and verify that the comment is
 * logically deleted (hidden, not physically removed), as indicated by the
 * deleted_at field.
 *
 * Test process:
 *
 * 1. Register a new discussion board user (with random email/password)
 * 2. Create a comment (using random valid body and parent article id) (Note: Since
 *    article creation is not in scope, use a valid random article id)
 * 3. User soft-deletes their own comment using the erase endpoint
 * 4. Verify the erase API returns the comment object marked as deleted (deleted_at
 *    is non-null)
 * 5. Confirm all business/type constraints: comment still exists, has same id,
 *    only deleted_at changed
 * 6. Authorization, field types, and DTO property contracts are all strictly
 *    validated (no type error scenarios)
 */
export async function test_api_comment_soft_delete_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a new comment (requires a valid article id and body)
  const fakeArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const commentBody: string & tags.MinLength<1> & tags.MaxLength<5000> =
    RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 10,
      wordMax: 20,
    }) as string & tags.MinLength<1> & tags.MaxLength<5000>;
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    {
      body: {
        discussion_board_article_id: fakeArticleId,
        body: commentBody,
      } satisfies IDiscussionBoardArticleComment.ICreate,
    },
  );
  typia.assert(comment);

  // 3. Soft-delete the comment just created
  const erased = await api.functional.discussionBoard.user.comments.erase(
    connection,
    {
      commentId: comment.id,
    },
  );
  typia.assert(erased);

  // 4. Verify deleted_at is now set (was null or undefined before), and other fields match original
  TestValidator.equals(
    "soft delete sets deleted_at timestamp",
    typeof erased.deleted_at === "string" &&
      erased.deleted_at !== null &&
      erased.deleted_at !== undefined,
    true,
  );
  TestValidator.equals(
    "comment id remains unchanged after soft-delete",
    erased.id,
    comment.id,
  );
  TestValidator.equals(
    "comment body remains after soft-delete",
    erased.body,
    comment.body,
  );
  TestValidator.equals(
    "article and author references remain the same",
    erased.article.id,
    comment.article.id,
  );
  TestValidator.equals(
    "author identity remains the same",
    erased.author.id,
    comment.author.id,
  );
  TestValidator.notEquals(
    "deleted_at is newly set and different from prior value",
    erased.deleted_at,
    comment.deleted_at,
  );
}
