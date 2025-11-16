import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate that updating a discussion board article category with a
 * non-existent business code fails and does not behave like an upsert.
 *
 * Business intent:
 *
 * - The PUT /discussionBoard/adminUser/articleCategories/:categoryCode operation
 *   is a pure update, not an upsert.
 * - When the target categoryCode does not exist in
 *   discussion_board_article_categories, the server must return an error
 *   instead of creating a new category.
 *
 * Test flow:
 *
 * 1. Join as an adminUser using POST /auth/adminUser/join to establish
 *    authenticated context (SDK: api.functional.auth.adminUser.join).
 * 2. Create at least one real category using POST
 *    /discussionBoard/adminUser/articleCategories (SDK:
 *    api.functional.discussionBoard.adminUser.articleCategories.create) so the
 *    table is non-empty and we know the set of real codes.
 * 3. Choose a deliberately non-existent categoryCode (e.g. "UNKNOWN_CODE") that
 *    differs from any created code.
 * 4. Call PUT /discussionBoard/adminUser/articleCategories/{categoryCode} (SDK:
 *    api.functional.discussionBoard.adminUser.articleCategories.update) with
 *    that fake code and a valid IDiscussionBoardArticleCategory.IUpdate body.
 * 5. Assert that the call results in an error (using TestValidator.error), proving
 *    that the endpoint does not accept non-existent codes and does not silently
 *    create new categories.
 *
 * Limitations:
 *
 * - No list/detail endpoint for categories is provided here, so we cannot
 *   directly re-query to prove absence of a new row. Instead, we rely on the
 *   fact that a failing update means no creation took place.
 */
export async function test_api_article_category_update_nonexistent_code_not_found(
  connection: api.IConnection,
) {
  // 1. Join as adminUser to obtain an authenticated context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a real category so that the table is known to be non-empty and
  //    we know at least one valid code.
  const realCategoryBody = {
    code: "ECONOMY",
    name: "Economy",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: 1 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const realCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: realCategoryBody,
      },
    );
  typia.assert(realCategory);

  // Confirm that our chosen fake code does not equal the real category code.
  const fakeCode = "UNKNOWN_CODE";
  TestValidator.notEquals(
    "fake code must differ from real category code",
    realCategory.code,
    fakeCode,
  );

  // 3 & 4. Attempt to update a non-existent categoryCode.
  const updateBody = {
    name: "Updated Nonexistent Category",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    order: 999 as number & tags.Type<"int32">,
  } satisfies IDiscussionBoardArticleCategory.IUpdate;

  await TestValidator.error(
    "updating non-existent category must fail",
    async () => {
      await api.functional.discussionBoard.adminUser.articleCategories.update(
        connection,
        {
          categoryCode: fakeCode,
          body: updateBody,
        },
      );
    },
  );
}
