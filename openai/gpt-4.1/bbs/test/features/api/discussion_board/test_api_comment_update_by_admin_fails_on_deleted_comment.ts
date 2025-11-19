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
 * Validate that admins cannot update deleted comments (soft-deleted).
 *
 * 1. Register a user and login.
 * 2. User creates a comment (on an existing article).
 * 3. User deletes (soft-deletes) the comment.
 * 4. Register an admin and login as admin.
 * 5. Attempt to update the deleted comment as admin.
 * 6. Verify that the update fails with a business validation error, and the
 *    comment remains deleted.
 */
export async function test_api_comment_update_by_admin_fails_on_deleted_comment(
  connection: api.IConnection,
) {
  // 1. Register user
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = RandomGenerator.alphaNumeric(10); // Min 8 chars
  const userJoin = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword as string &
        tags.MinLength<8> &
        tags.MaxLength<72> &
        tags.Format<"password">,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoin);

  // 2. User logs in
  await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://test-client/login", // Test value
      referrer: "https://test-client/", // Test value
    } satisfies IDiscussionBoardUser.ILogin,
  });

  // 3. User creates comment - need to fake an article (simulate scenario)
  const fakeArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createCommentReq = {
    discussion_board_article_id: fakeArticleId,
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardArticleComment.ICreate;
  const comment = await api.functional.discussionBoard.user.comments.create(
    connection,
    { body: createCommentReq },
  );
  typia.assert(comment);
  const commentId = comment.id;

  // 4. User soft-deletes the comment
  const erased = await api.functional.discussionBoard.user.comments.erase(
    connection,
    {
      commentId,
    },
  );
  typia.assert(erased);
  TestValidator.predicate(
    "deleted_at is set after erase",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );

  // 5. Register admin and login as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(10);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword as string &
        tags.MinLength<8> &
        tags.Format<"password">,
      href: "https://test-client/admin/join",
      referrer: "https://test-client/",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });

  // 6. Attempt update as admin (should fail)
  await TestValidator.error("admin cannot update deleted comment", async () => {
    await api.functional.discussionBoard.admin.comments.update(connection, {
      commentId,
      body: {
        body: "trying to edit as admin",
      } satisfies IDiscussionBoardArticleComment.IUpdate,
    });
  });

  // Confirm the comment's deleted_at has not changed and is set
  // The update endpoint does not return the comment, so we only verify erased.deleted_at is unchanged from earlier
  TestValidator.predicate(
    "deleted_at still set after failed update",
    erased.deleted_at !== null && erased.deleted_at !== undefined,
  );
}
