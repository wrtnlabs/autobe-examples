import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";

export async function test_api_admin_comment_creation_blocked_when_article_missing(
  connection: api.IConnection,
) {
  /**
   * Validate that an admin cannot create a comment on a non-existent article.
   *
   * Business intent:
   *
   * - The comment creation endpoint must enforce that the target article exists
   *   and is commentable.
   * - When an admin attempts to create a comment for an unknown articleId, the
   *   operation must fail and no comment record must be created.
   *
   * High level flow:
   *
   * 1. Register a fresh admin user via /auth/adminUser/join.
   *
   *    - This also attaches an access token to the connection via SDK side-effects,
   *         enabling authenticated admin calls.
   * 2. Generate a random UUID that does not correspond to any existing article,
   *    because this test never creates an article.
   * 3. Call POST /discussionBoard/adminUser/articles/{articleId}/comments with
   *    that random articleId and a valid comment body.
   * 4. Assert that the call fails using TestValidator.error, without checking a
   *    specific HTTP status code.
   */

  // 1. Register a new admin user and establish an authenticated admin session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Generate a UUID that is expected not to correspond to any article,
  //    since we do not create any article within this test.
  const missingArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare a valid comment body for the creation attempt.
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardComment.ICreate;

  // 4. Attempt to create the comment and assert that it fails because the
  //    article does not exist. We only assert that an error is thrown, not the
  //    specific HTTP status code, per global testing rules.
  await TestValidator.error(
    "admin comment creation must fail when target article does not exist",
    async () => {
      await api.functional.discussionBoard.adminUser.articles.comments.create(
        connection,
        {
          articleId: missingArticleId,
          body: commentBody,
        },
      );
    },
  );
}
