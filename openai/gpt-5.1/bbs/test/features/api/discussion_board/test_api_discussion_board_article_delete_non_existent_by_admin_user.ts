import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";

/**
 * Validate admin-only deletion behavior when targeting a non-existent article.
 *
 * Business purpose: This test ensures that the adminUser deletion endpoint for
 * discussion board articles behaves correctly when asked to delete an article
 * ID that does not exist. Even though the high-level scenario mentions
 * verifying 404 responses and ensuring existing articles remain untouched, the
 * currently provided SDK only exposes admin join and article erase operations
 * (no article creation or public article read), so the test focuses on what is
 * actually implementable:
 *
 * - Establishing a real adminUser session via POST /auth/adminUser/join.
 * - Calling DELETE /discussionBoard/adminUser/articles/{articleId} with a UUID
 *   that is extremely unlikely to exist in the database.
 * - Verifying that the API responds with an HTTP error, using
 *   TestValidator.httpError, rather than succeeding silently.
 *
 * Although we cannot absolutely guarantee the selected UUID does not correspond
 * to a real article (because we cannot list or create articles with the
 * provided SDK), using a freshly generated random UUID is sufficient for
 * practical E2E validation in this constrained test harness.
 *
 * Steps:
 *
 * 1. Join as a new adminUser using api.functional.auth.adminUser.join with a
 *    realistic IDiscussionBoardAdminUserJoin.IRequest payload.
 * 2. Confirm that the join response conforms to
 *    IDiscussionBoardAdminuser.IAuthorized using typia.assert.
 * 3. Generate a random UUID value for articleId using typia.random with string &
 *    tags.Format<"uuid"> to represent a non-existent article ID.
 * 4. Invoke api.functional.discussionBoard.adminUser.articles.erase with the
 *    random articleId while authenticated as the adminUser.
 * 5. Use TestValidator.httpError to assert that the erase call results in an HTTP
 *    error (404 Not Found is the primary expectation according to endpoint
 *    docs, but the validator allows a small set of related error codes to keep
 *    the test robust).
 */
export async function test_api_discussion_board_article_delete_non_existent_by_admin_user(
  connection: api.IConnection,
) {
  // 1. Join as a new adminUser
  const requestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: "127.0.0.1",
    href: "https://frontend.example.com/admin/join",
    referrer: "https://frontend.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: requestBody,
    });
  typia.assert(admin);

  // 2. Generate a random UUID that should not correspond to any real article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to erase the non-existent article and expect an HTTP error
  await TestValidator.httpError(
    "admin delete non-existent article should return HTTP error",
    [404, 400, 403],
    async () => {
      return await api.functional.discussionBoard.adminUser.articles.erase(
        connection,
        {
          articleId: nonExistentArticleId,
        },
      );
    },
  );
}
