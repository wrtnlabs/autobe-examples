import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Ensure that requesting a discussion-board article category by a non-existent
 * business code yields a 404-style error, while valid codes still work.
 *
 * Business context:
 *
 * - Categories (like "ECONOMY" or "POLITICS") are stored in
 *   discussion_board_article_categories and exposed via a public
 *   /discussionBoard/articleCategories/{categoryCode} endpoint.
 * - The endpoint must return a 404 Not Found when the provided categoryCode does
 *   not match any active (non-deleted) category.
 *
 * Test flow:
 *
 * 1. Register an adminUser using POST /auth/adminUser/join. This also issues
 *    adminUser tokens on the shared connection so subsequent admin-only
 *    endpoints are authorized.
 * 2. Using the adminUser session, create at least one article category via POST
 *    /discussionBoard/adminUser/articleCategories with a concrete code like
 *    "ECONOMY". This proves that at least one valid category exists and that
 *    the GET endpoint can later succeed.
 * 3. Call GET /discussionBoard/articleCategories/{categoryCode} with the known
 *    existing code and assert that a valid IDiscussionBoardArticleCategory is
 *    returned and passes typia.assert.
 * 4. Prepare a clearly non-existent category business code, such as
 *    "NON_EXISTING_CATEGORY_CODE_123" with a random suffix. Ensure it is
 *    distinct from the created category code.
 * 5. Call GET /discussionBoard/articleCategories/{categoryCode} with this unknown
 *    code, expecting the backend to respond with a 404 Not Found. Since SDK
 *    calls throw HttpError on non-2xx responses, wrap the call with
 *    TestValidator.httpError and assert that a 404 is produced.
 *
 * Validation points:
 *
 * - Successful retrieval for the known category code returns a payload that
 *   conforms to IDiscussionBoardArticleCategory.
 * - The non-existent code path reliably produces an HttpError with 404 status,
 *   ensuring no empty object or 200/204 is returned.
 *
 * Notes:
 *
 * - The GET /discussionBoard/articleCategories/{categoryCode} endpoint is public
 *   (no auth required), but calling it with an already-authenticated connection
 *   is acceptable; token headers will be ignored.
 */
export async function test_api_article_category_retrieval_not_found_for_unknown_code(
  connection: api.IConnection,
) {
  // 1. Register an adminUser (auth.adminUser.join) to obtain an admin session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a baseline article category using the adminUser actor.
  const existingCategoryCode = "ECONOMY";
  const createBody = {
    code: existingCategoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCategory);

  // 3. Verify that GET by existing code works and returns a valid category.
  const loadedCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.articleCategories.at(connection, {
      categoryCode: createdCategory.code,
    });
  typia.assert(loadedCategory);

  TestValidator.equals(
    "loaded category should match created category id",
    loadedCategory.id,
    createdCategory.id,
  );

  // 4. Prepare a clearly non-existing category code.
  const nonExistingCategoryCode =
    "NON_EXISTING_CATEGORY_CODE_" + RandomGenerator.alphaNumeric(8);

  // 5. Call GET with the unknown code and assert a 404 HttpError is thrown.
  await TestValidator.httpError(
    "requesting unknown category code should yield 404",
    404,
    async () => {
      await api.functional.discussionBoard.articleCategories.at(connection, {
        categoryCode: nonExistingCategoryCode,
      });
    },
  );
}
