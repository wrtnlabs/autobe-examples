import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Permanently deletes a user's own article via user endpoint and verifies
 * authentication enforcement.
 *
 * 1. Register a user and log in using /auth/user/join.
 * 2. (Assumption) Assume an articleId exists that this user owns (article creation
 *    API not provided).
 * 3. Attempt to hard-delete the article as the owning user using DELETE
 *    /discussionBoard/user/articles/{articleId}.
 * 4. Confirm that the deletion does not throw an error (returns void
 *    successfully).
 * 5. Attempt to delete the article again (should error as it is already deleted or
 *    not found).
 * 6. Register a second user using /auth/user/join, and attempt deletion with this
 *    user; ensure deletion fails (not authorized or not found).
 * 7. Attempt deletion using an unauthenticated connection; ensure deletion fails
 *    (not authorized or not found).
 * 8. (Note: Cannot test cascade deletion of comments/attachments due to missing
 *    DTOs and APIs.)
 */
export async function test_api_article_permanent_deletion_by_user(
  connection: api.IConnection,
) {
  // 1. Register first user (owner)
  const user1Body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
  } satisfies IDiscussionBoardUser.ICreate;
  const user1: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user1Body,
    });
  typia.assert(user1);

  // 2. No article creation endpoint in provided API/functions, so generate a random UUID to use as a target articleId under the assumption.
  const articleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to delete the article as the owner (the operation should succeed if the article exists)
  await api.functional.discussionBoard.user.articles.erase(connection, {
    articleId,
  });

  // 4. Attempt to delete the same article again (should fail with error: not found or forbidden)
  await TestValidator.error(
    "deletion of already deleted or non-existent article should fail",
    async () => {
      await api.functional.discussionBoard.user.articles.erase(connection, {
        articleId,
      });
    },
  );

  // 5. Register another user
  const user2Body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
    >(),
  } satisfies IDiscussionBoardUser.ICreate;
  const user2: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: user2Body,
    });
  typia.assert(user2);

  // 6. Switch to user2 (second user) context and attempt to delete the article
  await TestValidator.error(
    "unauthorized user cannot delete another user's article",
    async () => {
      await api.functional.discussionBoard.user.articles.erase(connection, {
        articleId,
      });
    },
  );

  // 7. Attempt deletion without authentication (unauthenticated connection)
  const unauthenticatedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion attempt should fail",
    async () => {
      await api.functional.discussionBoard.user.articles.erase(
        unauthenticatedConn,
        { articleId },
      );
    },
  );
}
