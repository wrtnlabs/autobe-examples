import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate that deleting a non-existent discussion-board article category by
 * its business code results in an error and does not affect existing
 * categories.
 *
 * Business context: Administrative users manage article categories in the
 * economic and political discussion board. Each category has a unique business
 * `code` used as the identifier in URLs. Deleting by a non-existent category
 * code must not silently succeed and must not alter other categories.
 *
 * Test steps:
 *
 * 1. Establish an adminUser session via POST /auth/adminUser/join.
 * 2. Create at least one valid article category via POST
 *    /discussionBoard/adminUser/articleCategories and assert its shape using
 *    typia.assert.
 * 3. Construct a clearly non-existent categoryCode (string) that does not match
 *    any of the created category codes.
 * 4. As the authenticated adminUser, attempt to DELETE
 *    /discussionBoard/adminUser/articleCategories/{categoryCode} using this
 *    non-existent code and expect an error.
 * 5. Assert that the delete operation throws, using TestValidator.error with an
 *    async callback.
 * 6. Optionally re-use the created category objects locally to demonstrate that
 *    they are still valid DTOs via typia.assert, acknowledging that we do not
 *    have a list/read endpoint to check persistence directly.
 */
export async function test_api_article_category_delete_nonexistent_code_not_found(
  connection: api.IConnection,
) {
  // 1. Establish adminUser session via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: null,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const admin: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create at least one valid article category
  const categoryBody = {
    code: RandomGenerator.alphaNumeric(12).toUpperCase(),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(createdCategory);

  // 3. Construct a non-existent category code
  const nonExistentCode: string = `${createdCategory.code}_${RandomGenerator.alphaNumeric(6)}`;

  TestValidator.notEquals(
    "non-existent code must differ from existing category code",
    nonExistentCode,
    createdCategory.code,
  );

  // 4 & 5. Attempt to delete with non-existent code and expect error
  await TestValidator.error(
    "deleting non-existent category code should fail",
    async () => {
      await api.functional.discussionBoard.adminUser.articleCategories.erase(
        connection,
        {
          categoryCode: nonExistentCode,
        },
      );
    },
  );

  // 6. Re-assert that the originally created category DTO is still valid
  // (local DTO integrity check; we cannot re-fetch from server here).
  typia.assert<IDiscussionBoardArticleCategory>(createdCategory);
}
