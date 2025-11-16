import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate that an authenticated adminUser can create and then logically delete
 * (retire) a discussion-board article category by its business code.
 *
 * Business context:
 *
 * - Category management is restricted to administrative users (adminUser).
 * - Categories are soft-deleted (retired) through the erase endpoint, which uses
 *   the category's stable business code as its identifier.
 *
 * Test workflow:
 *
 * 1. Register and authenticate an adminUser via POST /auth/adminUser/join.
 *
 *    - This returns IDiscussionBoardAdminuser.IAuthorized and installs the access
 *         token into connection.headers via the SDK.
 * 2. Create a new article category via POST
 *    /discussionBoard/adminUser/articleCategories using
 *    IDiscussionBoardArticleCategory.ICreate.
 *
 *    - Capture the returned IDiscussionBoardArticleCategory and its `code`.
 * 3. Call DELETE /discussionBoard/adminUser/articleCategories/{categoryCode} using
 *    that `code` via api.functional.discussionBoard.adminUser
 *    .articleCategories.erase.
 * 4. Assert that all non-void API responses conform to their DTOs using
 *    typia.assert, and that the erase operation completes without throwing.
 *
 * Due to the absence of read/list endpoints in the current SDK surface, this
 * test does not re-fetch the category to inspect `deleted_at`. Instead, it
 * focuses on a successful end-to-end flow and type-level contract validation.
 */
export async function test_api_article_category_delete_soft_retirement_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    // Keep optional profile fields undefined for simplicity.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new article category under this adminUser.
  const createCategoryBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: createCategoryBody,
      },
    );
  typia.assert(createdCategory);

  // Sanity-check: createdCategory.code should equal the code we requested.
  TestValidator.equals(
    "created category code should match requested code",
    createdCategory.code,
    createCategoryBody.code,
  );

  // 3. Retire (soft-delete) the category by its business code.
  await api.functional.discussionBoard.adminUser.articleCategories.erase(
    connection,
    {
      categoryCode: createdCategory.code,
    },
  );

  // 4. If we reached here without an exception, logical deletion
  // has succeeded from the API contract perspective. There is no
  // non-void response to assert, so we only validate control flow.
  await TestValidator.predicate(
    "erase operation for existing category should complete without throwing",
    async () => true,
  );
}
