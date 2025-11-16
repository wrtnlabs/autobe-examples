import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Verify that the public article category detail endpoint only exposes active
 * categories and rejects unknown/retired codes.
 *
 * Business context:
 *
 * - Article categories are master data identified by a stable `code`.
 * - The public GET /discussionBoard/articleCategories/{categoryCode} endpoint is
 *   documented to return only categories where `deleted_at` is null and to
 *   respond with 404 when no active record exists for the requested code.
 * - Available APIs in this scope allow us to (a) register an adminUser and (b)
 *   create a new article category, but there is no soft-delete/update operation
 *   exposed. Therefore, this test focuses on validating that:
 *
 *   1. A freshly created active category is retrievable via the public endpoint, and
 *   2. A clearly non-existent category code results in an error when retrieved,
 *        representing the behavior for soft-deleted/retired categories as
 *        well.
 *
 * Test steps:
 *
 * 1. Join an adminUser using POST /auth/adminUser/join to establish an admin
 *    session; the SDK will automatically store the issued access token in the
 *    connection headers.
 * 2. As the adminUser, create a new article category using POST
 *    /discussionBoard/adminUser/articleCategories with a unique `code`, and
 *    realistic name/description/order values.
 * 3. Call GET /discussionBoard/articleCategories/{categoryCode} with the created
 *    `code` to ensure the public read model returns the category:
 *
 *    - Verify the response structure using typia.assert.
 *    - Assert that the `code` and `name` match the creation payload.
 * 4. Call GET /discussionBoard/articleCategories/{categoryCode} again but using a
 *    different, highly unlikely `code` (e.g., a long random token prefixed with
 *    a marker). Wrap this in TestValidator.error to assert that the endpoint
 *    rejects unknown codes (which would include soft-deleted categories
 *    according to the contract). We do not assert a specific HTTP status code,
 *    only that an error occurs.
 *
 * This test thereby validates that the endpoint exposes active categories and
 * does not silently succeed for unknown/retired codes, which is the effective
 * contract implied by the `deleted_at` semantics on the underlying model.
 */
export async function test_api_article_category_retrieval_ignores_soft_deleted_categories(
  connection: api.IConnection,
) {
  // 1. AdminUser join to obtain administrative session and token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: joinBody,
  });
  typia.assert<IDiscussionBoardAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a new active article category as adminUser
  const categoryCodeBase = RandomGenerator.alphabets(12);
  const createBody = {
    code: categoryCodeBase,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IDiscussionBoardArticleCategory>(createdCategory);

  TestValidator.equals(
    "created category code should match request payload",
    createdCategory.code,
    createBody.code,
  );
  TestValidator.equals(
    "created category name should match request payload",
    createdCategory.name,
    createBody.name,
  );

  // 3. Public retrieval of the active category by its business code
  const fetchedCategory =
    await api.functional.discussionBoard.articleCategories.at(connection, {
      categoryCode: createBody.code,
    });
  typia.assert<IDiscussionBoardArticleCategory>(fetchedCategory);

  TestValidator.equals(
    "fetched category code should equal created category code",
    fetchedCategory.code,
    createdCategory.code,
  );
  TestValidator.equals(
    "fetched category name should equal created category name",
    fetchedCategory.name,
    createdCategory.name,
  );

  // 4. Retrieval attempt with a clearly non-existent category code
  const nonexistentCode = `NON_EXISTENT_${RandomGenerator.alphaNumeric(32)}`;

  await TestValidator.error(
    "requesting a non-existent category code should fail",
    async () => {
      await api.functional.discussionBoard.articleCategories.at(connection, {
        categoryCode: nonexistentCode,
      });
    },
  );
}
