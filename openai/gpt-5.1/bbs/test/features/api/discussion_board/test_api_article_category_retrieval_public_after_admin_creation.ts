import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

/**
 * Validate that an article category created by an admin user is publicly
 * retrievable by its business code.
 *
 * Business workflow:
 *
 * 1. Admin joins via POST /auth/adminUser/join and becomes authenticated.
 * 2. Admin creates a new article category with a unique business code via POST
 *    /discussionBoard/adminUser/articleCategories.
 * 3. Using an unauthenticated connection (no Authorization header), call GET
 *    /discussionBoard/articleCategories/{categoryCode} to retrieve the category
 *    by its business code.
 * 4. Verify that the retrieved category matches the created one in code, name,
 *    description, and order, and that it is active (deleted_at is
 *    null/undefined) with valid timestamps.
 * 5. Call the public GET endpoint again with the same code to confirm that
 *    repeated reads are idempotent and return identical data.
 */
export async function test_api_article_category_retrieval_public_after_admin_creation(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin creates a new article category
  const businessCode: string = `ECONOMY-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const categoryCreateBody = {
    code: businessCode,
    name: `Economy ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    order: 0,
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const createdCategory: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(createdCategory);

  // Basic sanity checks on created category
  TestValidator.equals(
    "created category code matches request",
    createdCategory.code,
    categoryCreateBody.code,
  );
  TestValidator.equals(
    "created category name matches request",
    createdCategory.name,
    categoryCreateBody.name,
  );
  TestValidator.equals(
    "created category description matches request",
    createdCategory.description ?? null,
    categoryCreateBody.description ?? null,
  );
  TestValidator.equals(
    "created category order matches request",
    createdCategory.order,
    categoryCreateBody.order,
  );
  TestValidator.equals(
    "newly created category should not be soft-deleted",
    createdCategory.deleted_at ?? null,
    null,
  );

  // 3. Prepare an unauthenticated connection for public GET
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 4. Publicly retrieve the category by business code (first read)
  const fetchedCategory1: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.articleCategories.at(
      publicConnection,
      {
        categoryCode: createdCategory.code,
      },
    );
  typia.assert(fetchedCategory1);

  // 5. Validate public retrieval fields match the created category
  TestValidator.equals(
    "public fetch code matches created category",
    fetchedCategory1.code,
    createdCategory.code,
  );
  TestValidator.equals(
    "public fetch name matches created category",
    fetchedCategory1.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "public fetch description matches created category",
    fetchedCategory1.description ?? null,
    createdCategory.description ?? null,
  );
  TestValidator.equals(
    "public fetch order matches created category",
    fetchedCategory1.order,
    createdCategory.order,
  );
  TestValidator.equals(
    "publicly fetched category is not soft-deleted",
    fetchedCategory1.deleted_at ?? null,
    null,
  );

  // 6. Call the public GET endpoint again to ensure idempotent behavior
  const fetchedCategory2: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.articleCategories.at(
      publicConnection,
      {
        categoryCode: createdCategory.code,
      },
    );
  typia.assert(fetchedCategory2);

  // 7. Ensure repeated public GET calls return identical data
  TestValidator.equals(
    "second public fetch equals first public fetch",
    fetchedCategory2,
    fetchedCategory1,
  );
}
