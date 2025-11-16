import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate idempotent deletion (retirement) of discussion-board article
 * categories.
 *
 * Business context: Administrative users (adminUser actor) manage
 * discussion-board article categories that live in
 * `discussion_board_article_categories`. Deletion is implemented as a
 * retirement via the `deleted_at` timestamp. This test ensures that deleting a
 * category by its business `code` is safe and well-defined even when invoked
 * multiple times for the same category.
 *
 * Test goal: Verify that calling DELETE
 * /discussionBoard/adminUser/articleCategories/{categoryCode} on an
 * already-retired category behaves idempotently from the client perspective:
 * the second call must not cause unexpected failures at the test level and must
 * be treated as a stable, well-defined operation.
 *
 * End-to-end workflow:
 *
 * 1. Register an adminUser via POST /auth/adminUser/join.
 *
 *    - Use a random but valid email, password, href, and referrer to obtain an
 *         authenticated admin session.
 * 2. As this adminUser, create an article category via POST
 *    /discussionBoard/adminUser/articleCategories.
 *
 *    - Construct an IDiscussionBoardArticleCategory.ICreate body with:
 *
 *         - Unique `code` (stable machine-friendly string)
 *         - Random human-friendly `name`
 *         - Optional `description` (random paragraph or null)
 *         - `order` as a reasonable int32 value.
 *    - Receive IDiscussionBoardArticleCategory and assert its shape with
 *         typia.assert.
 * 3. Retire the category via DELETE
 *    /discussionBoard/adminUser/articleCategories/{categoryCode}.
 *
 *    - Use the `code` from the created category as `categoryCode`.
 *    - The erase() function returns void; simply await it to ensure successful
 *         completion.
 * 4. Immediately call the same DELETE endpoint again with the identical
 *    `categoryCode`.
 *
 *    - Wrap the second call in TestValidator.error to validate that the backend
 *         exposes a well-defined behavior for already-retired categories. Since
 *         we are prohibited from checking exact HTTP status codes, we only
 *         assert that some error is thrown (e.g., not-found or business-rule
 *         violation), which still represents clear semantics from the
 *         perspective of this test.
 *
 * Assertions and validations:
 *
 * - Typia.assert on the admin join response
 *   (IDiscussionBoardAdminuser.IAuthorized).
 * - Typia.assert on the created category (IDiscussionBoardArticleCategory).
 * - For the first DELETE call, only await the promise to ensure it completes
 *   successfully without throwing.
 * - For the second DELETE, use `await TestValidator.error` with an async closure
 *   that calls erase(), asserting that the system does not silently succeed
 *   when attempting to delete an already-retired category. We do not validate
 *   specific HTTP status codes or error messages.
 */
export async function test_api_article_category_delete_idempotent_on_already_retired_category(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authenticated admin session.
  const joinBody = typia.random<IDiscussionBoardAdminUserJoin.IRequest>();
  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new article category with a unique code.
  const createBody = {
    code: RandomGenerator.alphaNumeric(12).toUpperCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 1,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(category);

  // 3. First delete: retire the newly created category by its business code.
  await api.functional.discussionBoard.adminUser.articleCategories.erase(
    connection,
    {
      categoryCode: category.code,
    },
  );

  // 4. Second delete: attempt to delete the already-retired category again.
  //    We assert that some error is thrown, representing clear semantics
  //    (e.g., not-found or already-retired) without validating specific status.
  await TestValidator.error(
    "second delete on already-retired category should fail with a defined error",
    async () => {
      await api.functional.discussionBoard.adminUser.articleCategories.erase(
        connection,
        {
          categoryCode: category.code,
        },
      );
    },
  );
}
