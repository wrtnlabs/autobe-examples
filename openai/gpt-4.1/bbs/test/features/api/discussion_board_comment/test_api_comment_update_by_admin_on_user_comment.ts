import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Test that an admin can successfully update the content of a user-created
 * comment on a discussion board article, strictly validating authorization,
 * business rules, and E2E workflow.
 *
 * This test simulates a multi-actor workflow covering:
 *
 * 1. Register a new user (and login as user)
 * 2. User creates a comment (on a random article)
 * 3. Register an admin (and login as admin, switching authorization)
 * 4. Admin updates the user's comment via the admin endpoint, submitting a valid
 *    new comment body
 * 5. Validate the update succeeded: the comment body is changed, and admin was
 *    authorized
 * 6. Attempt to update with invalid (empty) body and expect an error (business
 *    rule: non-empty, max 5000 chars)
 * 7. Optionally, attempt update as user (not admin) to verify forbidden (if API
 *    supports role validation)
 *
 * Each actor switch must be followed precisely; all business constraints for
 * comment update are validated (authorization, body constraints, correct
 * versioning and timestamps).
 *
 * Validation includes:
 *
 * - Body is updated in response
 * - Author, article, and comment id are unchanged
 * - Timestamps are updated appropriately
 * - Errors are asserted for business rule violations (e.g., empty or overlong
 *   body)
 */
export async function test_api_comment_update_by_admin_on_user_comment(
  connection: api.IConnection,
) {
  // 1. Register & login as user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = RandomGenerator.alphaNumeric(12);
  const userReg = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<72> &
        tags.Format<"password">,
    },
  });
  typia.assert(userReg);

  // Login as user (session ensured)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://test-client/autobe-test-user-login",
      referrer: "https://test-client/autobe-test-user-login-landing",
    },
  });

  // 2. User creates a comment (simulate article id)
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const commentBody = RandomGenerator.paragraph({ sentences: 7 });
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    {
      body: {
        discussion_board_article_id: articleId,
        body: commentBody as string & tags.MinLength<1> & tags.MaxLength<5000>,
      },
    },
  );
  typia.assert(comment);

  // 3. Register & login as admin (actor switch)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      href: "https://test-client/autobe-test-admin-join",
      referrer: "https://test-client/autobe-test-admin-landing",
    },
  });
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });

  // 4. Admin updates user's comment
  const newBody = RandomGenerator.paragraph({ sentences: 13 });
  const updateRes = await api.functional.discussionBoard.admin.comments.update(
    connection,
    {
      commentId: comment.id,
      body: {
        body: newBody as string & tags.MinLength<1> & tags.MaxLength<5000>,
      },
    },
  );
  typia.assert(updateRes);
  TestValidator.equals(
    "comment id remains same after update",
    updateRes.id,
    comment.id,
  );
  TestValidator.equals(
    "comment author unchanged",
    updateRes.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "comment article unchanged",
    updateRes.article.id,
    comment.article.id,
  );
  TestValidator.equals("comment body updated", updateRes.body, newBody);
  TestValidator.predicate(
    "updated_at is updated",
    Date.parse(updateRes.updated_at) > Date.parse(comment.updated_at),
  );

  // 5. Admin attempts to update with invalid (empty) body: expect error
  await TestValidator.error(
    "admin cannot update comment with empty body",
    async () => {
      await api.functional.discussionBoard.admin.comments.update(connection, {
        commentId: comment.id,
        body: { body: "" as string & tags.MinLength<1> & tags.MaxLength<5000> },
      });
    },
  );

  // 6. Attempt overlong body > 5000 characters (should fail)
  await TestValidator.error(
    "comment update with overlong body rejected",
    async () => {
      await api.functional.discussionBoard.admin.comments.update(connection, {
        commentId: comment.id,
        body: {
          body: "a".repeat(5001) as string &
            tags.MinLength<1> &
            tags.MaxLength<5000>,
        },
      });
    },
  );

  // 7. Optionally, switch back to user and attempt update (should be forbidden if role-restricted)
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://test-client/autobe-test-user-login",
      referrer: "https://test-client/autobe-test-user-login-landing",
    },
  });
  await TestValidator.error(
    "user (not admin) cannot update another's comment via admin endpoint",
    async () => {
      await api.functional.discussionBoard.admin.comments.update(connection, {
        commentId: comment.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }) as string &
            tags.MinLength<1> &
            tags.MaxLength<5000>,
        },
      });
    },
  );
}
